import { logger } from "@trendx/logs";

import { buildDashboardOverview } from "../../dashboard/lib/build-overview";
import type {
  DashboardExecutionConfig,
  DashboardPair,
  GetDashboardOverviewOutput,
} from "../../dashboard/types";
import {
  type BinanceFuturesConfig,
  type BinanceFuturesSymbolTradingRules,
  type BinancePlacedAlgoOrder,
  type BinancePlacedOrder,
  type BinanceTrackedPosition,
  cancelBinanceAllAlgoOpenOrders,
  cancelBinanceAllOpenOrders,
  fetchBinanceAccountInformation,
  fetchBinanceMarkPrice,
  fetchBinanceSymbolTradingRules,
  fetchBinanceTrackedPosition,
  getBinanceFuturesConfig,
  placeBinanceCloseAllProtectionOrder,
  placeBinanceMarketOrder,
  roundDownToStepSize,
  setBinanceMarginTypeToCross,
  setBinanceSymbolLeverage,
} from "../../exchange/lib/binance-client";
import type {
  ClosePositionInput,
  ExecuteNextStageInput,
  ExecutionMutationOutput,
} from "../types";
import { getHardRiskBlockReason } from "./hard-risk-controls";
import {
  persistCloseExecution,
  persistEntryExecution,
} from "./persist-execution";

const FALLBACK_SIGNAL_REASON =
  "Signal feed is currently on fallback data; opening new testnet positions is disabled.";
const REFERENCE_RISK_REASON =
  "Binance testnet account is not synced yet; execution remains disabled.";
const TESTNET_ONLY_REASON =
  "TrendX execution procedures are currently locked to Binance testnet only.";
const KILL_SWITCH_REASON =
  "Global kill switch is enabled; execution is blocked.";
const NOTIONAL_TOLERANCE_RATIO = 0.15;
const NOTIONAL_TOLERANCE_USD = 15;

interface StageExecutionCandidate {
  notionalUsd: number;
  stage: DashboardPair["entryStages"][number];
}

interface ProtectionSyncResult {
  reason: string | null;
  stopLoss: BinancePlacedAlgoOrder | null;
  success: boolean;
  takeProfit: BinancePlacedAlgoOrder | null;
}

function getExecutionBudget(
  equity: number,
  executionConfig: DashboardExecutionConfig,
): {
  marginUsd: number;
  notionalUsd: number;
} {
  const marginUsd = equity * (executionConfig.balanceAllocationPct / 100);

  return {
    marginUsd,
    notionalUsd: marginUsd * executionConfig.leverage,
  };
}

function getEntryStageNotional(
  equity: number,
  executionConfig: DashboardExecutionConfig,
  allocationPct: number,
): number {
  const totalBudget = getExecutionBudget(equity, executionConfig);

  return totalBudget.notionalUsd * (allocationPct / 100);
}

function getStageTraversalOrder(
  trendDirection: DashboardPair["trendDirection"],
): DashboardPair["entryStages"][number]["zone"][] {
  if (trendDirection === "BEARISH") {
    return ["lower", "mid", "upper"];
  }

  return ["upper", "mid", "lower"];
}

function getEntryOrderSide(
  trendDirection: DashboardPair["trendDirection"],
): "BUY" | "SELL" | null {
  if (trendDirection === "BULLISH") {
    return "BUY";
  }

  if (trendDirection === "BEARISH") {
    return "SELL";
  }

  return null;
}

function getCloseOrderSide(
  positionSide: DashboardPair["currentPosition"]["side"],
): "BUY" | "SELL" | null {
  if (positionSide === "LONG") {
    return "SELL";
  }

  if (positionSide === "SHORT") {
    return "BUY";
  }

  return null;
}

function buildFailureOutput(
  symbol: DashboardPair["symbol"],
  reason: string,
): ExecutionMutationOutput {
  return {
    order: null,
    protectionOrders: null,
    reason,
    success: false,
    symbol,
    testnet: true,
  };
}

function isExecutionUsingReferenceRisk(
  overviewResult: GetDashboardOverviewOutput,
): boolean {
  return overviewResult.reason.includes(
    "Account risk remains reference-only until Binance execution is integrated.",
  );
}

function isFallbackSignalBlocked(
  overviewResult: GetDashboardOverviewOutput,
  symbol: DashboardPair["symbol"],
): boolean {
  return (
    overviewResult.reason.includes(
      "Coinank API key missing. Serving seeded dashboard overview.",
    ) ||
    overviewResult.reason.includes(
      "Seeded overview ready for PR1 dashboard scaffolding.",
    ) ||
    overviewResult.reason.includes(
      `${symbol} is using seeded fallback data after a Coinank fetch failure.`,
    )
  );
}

function findPairOrThrow(
  overviewResult: GetDashboardOverviewOutput,
  symbol: DashboardPair["symbol"],
): DashboardPair {
  const pair = overviewResult.overview.pairs.find(
    (candidate) => candidate.symbol === symbol,
  );

  if (!pair) {
    throw new Error(`TrendX overview is missing ${symbol}.`);
  }

  return pair;
}

function findNextStageToExecute(
  pair: DashboardPair,
  equity: number,
  executionConfig: DashboardExecutionConfig,
): StageExecutionCandidate | null {
  const zoneOrder = getStageTraversalOrder(pair.trendDirection);
  const stageByZone = new Map(
    pair.entryStages.map((stage) => [stage.zone, stage] as const),
  );
  let cumulativeNotionalUsd = 0;

  for (const zone of zoneOrder) {
    const stage = stageByZone.get(zone);

    if (!stage) {
      continue;
    }

    const stageNotionalUsd = getEntryStageNotional(
      equity,
      executionConfig,
      stage.allocationPct,
    );

    cumulativeNotionalUsd += stageNotionalUsd;

    if (stage.status !== "TRIGGERED") {
      continue;
    }

    const toleranceUsd = Math.max(
      NOTIONAL_TOLERANCE_USD,
      stageNotionalUsd * NOTIONAL_TOLERANCE_RATIO,
    );

    if (pair.currentPosition.sizeUsd < cumulativeNotionalUsd - toleranceUsd) {
      return {
        notionalUsd: stageNotionalUsd,
        stage,
      };
    }
  }

  return null;
}

function getEffectiveExecutionPrice(params: {
  fallbackMarkPrice: number;
  orderAveragePrice: number;
  positionEntryPrice: number;
}): number {
  if (params.orderAveragePrice > 0) {
    return params.orderAveragePrice;
  }

  if (params.positionEntryPrice > 0) {
    return params.positionEntryPrice;
  }

  return params.fallbackMarkPrice;
}

function buildExecutionOrder(params: {
  action: "CLOSE_POSITION" | "ENTRY_STAGE";
  fallbackMarkPrice: number;
  order: BinancePlacedOrder;
  position: BinanceTrackedPosition | null;
  stageZone: DashboardPair["entryStages"][number]["zone"] | null;
}): NonNullable<ExecutionMutationOutput["order"]> {
  const markPrice = params.position?.markPrice ?? params.fallbackMarkPrice;
  const executionPrice = getEffectiveExecutionPrice({
    fallbackMarkPrice: markPrice,
    orderAveragePrice: params.order.averagePrice,
    positionEntryPrice: params.position?.entryPrice ?? 0,
  });

  return {
    action: params.action,
    averagePrice: params.order.averagePrice,
    executedQty: params.order.executedQuantity,
    markPrice: Number(markPrice.toFixed(4)),
    notionalUsd: Number(
      (params.order.executedQuantity * executionPrice).toFixed(2),
    ),
    orderId: params.order.orderId,
    side: params.order.side,
    stageZone: params.stageZone,
  };
}

function buildProtectionOrdersOutput(protections: {
  stopLoss: BinancePlacedAlgoOrder | null;
  takeProfit: BinancePlacedAlgoOrder | null;
}): NonNullable<ExecutionMutationOutput["protectionOrders"]> {
  return {
    stopLoss: protections.stopLoss
      ? {
          algoId: protections.stopLoss.algoId,
          clientAlgoId: protections.stopLoss.clientAlgoId,
          side: protections.stopLoss.side,
          triggerPrice: protections.stopLoss.triggerPrice,
          type: protections.stopLoss.type,
        }
      : null,
    takeProfit: protections.takeProfit
      ? {
          algoId: protections.takeProfit.algoId,
          clientAlgoId: protections.takeProfit.clientAlgoId,
          side: protections.takeProfit.side,
          triggerPrice: protections.takeProfit.triggerPrice,
          type: protections.takeProfit.type,
        }
      : null,
  };
}

async function unwindEntryAfterProtectionFailure(params: {
  config: BinanceFuturesConfig;
  position: BinanceTrackedPosition;
  symbol: DashboardPair["symbol"];
  tradingRules: BinanceFuturesSymbolTradingRules;
}): Promise<string> {
  const closeSide = getCloseOrderSide(params.position.side);

  if (!closeSide) {
    return "Stop-loss placement failed, and TrendX could not determine a safe unwind side. Manual intervention is required.";
  }

  const closeQuantity = roundDownToStepSize(
    params.position.absoluteQuantity,
    params.tradingRules.quantityStepSize,
  );

  if (closeQuantity < params.tradingRules.minQuantity) {
    return "Stop-loss placement failed, and TrendX could not derive a valid Binance close quantity. Manual intervention is required.";
  }

  await Promise.allSettled([
    cancelBinanceAllOpenOrders(params.config, params.symbol),
    cancelBinanceAllAlgoOpenOrders(params.config, params.symbol),
  ]);

  try {
    const closeOrder = await placeBinanceMarketOrder(params.config, {
      quantity: closeQuantity,
      reduceOnly: true,
      side: closeSide,
      symbol: params.symbol,
    });

    return `Stop-loss placement failed, so TrendX flattened the fresh testnet position at market (${closeOrder.orderId}).`;
  } catch (error) {
    logger.error("TrendX failed to unwind unprotected testnet entry", {
      error: error instanceof Error ? error.message : String(error),
      symbol: params.symbol,
    });

    return "Stop-loss placement failed, and automatic unwind also failed. Manual intervention is required immediately.";
  }
}

async function syncProtectionOrders(params: {
  config: BinanceFuturesConfig;
  pair: DashboardPair;
  position: BinanceTrackedPosition;
  symbol: DashboardPair["symbol"];
  tradingRules: BinanceFuturesSymbolTradingRules;
}): Promise<ProtectionSyncResult> {
  const closeSide = getCloseOrderSide(params.position.side);

  if (!closeSide) {
    return {
      reason:
        "TrendX could not derive the close side for the protection orders.",
      stopLoss: null,
      success: false,
      takeProfit: null,
    };
  }

  await Promise.all([
    cancelBinanceAllOpenOrders(params.config, params.symbol),
    cancelBinanceAllAlgoOpenOrders(params.config, params.symbol),
  ]);

  let stopLossOrder: BinancePlacedAlgoOrder;

  try {
    stopLossOrder = await placeBinanceCloseAllProtectionOrder(params.config, {
      side: closeSide,
      symbol: params.symbol,
      triggerPrice: params.pair.stopLoss,
      type: "STOP_MARKET",
    });
  } catch (error) {
    logger.error("TrendX failed to arm stop-loss protection", {
      error: error instanceof Error ? error.message : String(error),
      symbol: params.symbol,
    });

    const unwindReason = await unwindEntryAfterProtectionFailure({
      config: params.config,
      position: params.position,
      symbol: params.symbol,
      tradingRules: params.tradingRules,
    });

    return {
      reason: unwindReason,
      stopLoss: null,
      success: false,
      takeProfit: null,
    };
  }

  try {
    const takeProfitOrder = await placeBinanceCloseAllProtectionOrder(
      params.config,
      {
        side: closeSide,
        symbol: params.symbol,
        triggerPrice: params.pair.takeProfitOne,
        type: "TAKE_PROFIT_MARKET",
      },
    );

    return {
      reason: null,
      stopLoss: stopLossOrder,
      success: true,
      takeProfit: takeProfitOrder,
    };
  } catch (error) {
    logger.warn("TrendX armed stop-loss but failed to place take-profit", {
      error: error instanceof Error ? error.message : String(error),
      symbol: params.symbol,
    });

    return {
      reason: "止损保护单已挂上，但首个止盈保护单未成功创建。",
      stopLoss: stopLossOrder,
      success: true,
      takeProfit: null,
    };
  }
}

export async function executeNextEntryStage(
  input: ExecuteNextStageInput,
): Promise<ExecutionMutationOutput> {
  const config = getBinanceFuturesConfig();

  if (!config) {
    return buildFailureOutput(input.symbol, REFERENCE_RISK_REASON);
  }

  if (config.mode !== "testnet") {
    return buildFailureOutput(input.symbol, TESTNET_ONLY_REASON);
  }

  const overviewResult = await buildDashboardOverview();

  if (overviewResult.overview.killSwitchEnabled) {
    return buildFailureOutput(input.symbol, KILL_SWITCH_REASON);
  }

  if (isExecutionUsingReferenceRisk(overviewResult)) {
    return buildFailureOutput(input.symbol, REFERENCE_RISK_REASON);
  }

  if (isFallbackSignalBlocked(overviewResult, input.symbol)) {
    return buildFailureOutput(input.symbol, FALLBACK_SIGNAL_REASON);
  }

  const pair = findPairOrThrow(overviewResult, input.symbol);

  if (pair.action !== "ENTRY") {
    return buildFailureOutput(
      input.symbol,
      "Current signal is not in entry state, so the next stage cannot be executed.",
    );
  }

  const orderSide = getEntryOrderSide(pair.trendDirection);

  if (!orderSide) {
    return buildFailureOutput(
      input.symbol,
      "Trend direction is neutral, so execution stays disabled.",
    );
  }

  if (
    pair.currentPosition.side !== "FLAT" &&
    ((pair.currentPosition.side === "LONG" && orderSide === "SELL") ||
      (pair.currentPosition.side === "SHORT" && orderSide === "BUY"))
  ) {
    return buildFailureOutput(
      input.symbol,
      "Existing position direction conflicts with the current signal; close the position first.",
    );
  }

  const stageCandidate = findNextStageToExecute(
    pair,
    overviewResult.overview.accountRisk.equity,
    overviewResult.overview.executionConfig,
  );

  if (!stageCandidate) {
    return buildFailureOutput(
      input.symbol,
      "No triggered tranche is pending execution right now.",
    );
  }

  const hardRiskBlockReason = await getHardRiskBlockReason({
    overviewResult,
    pair,
    stage: stageCandidate.stage,
  });

  if (hardRiskBlockReason) {
    return buildFailureOutput(input.symbol, hardRiskBlockReason);
  }

  const [markPrice, tradingRules] = await Promise.all([
    fetchBinanceMarkPrice(config, input.symbol),
    fetchBinanceSymbolTradingRules(config, input.symbol),
  ]);

  if (tradingRules.status !== "TRADING") {
    return buildFailureOutput(
      input.symbol,
      `Binance reports ${input.symbol} as ${tradingRules.status}, so execution is blocked.`,
    );
  }

  await setBinanceMarginTypeToCross(config, input.symbol);
  await setBinanceSymbolLeverage(config, {
    leverage: overviewResult.overview.executionConfig.leverage,
    symbol: input.symbol,
  });

  const rawQuantity = stageCandidate.notionalUsd / markPrice;
  const quantity = roundDownToStepSize(
    rawQuantity,
    tradingRules.quantityStepSize,
  );

  if (quantity < tradingRules.minQuantity) {
    return buildFailureOutput(
      input.symbol,
      `Calculated quantity ${quantity} is below Binance minimum quantity ${tradingRules.minQuantity}.`,
    );
  }

  const notionalUsd = quantity * markPrice;

  if (
    tradingRules.minNotionalUsd !== null &&
    notionalUsd < tradingRules.minNotionalUsd
  ) {
    return buildFailureOutput(
      input.symbol,
      `Calculated notional ${notionalUsd.toFixed(2)} is below Binance minimum notional ${tradingRules.minNotionalUsd.toFixed(2)}.`,
    );
  }

  const order = await placeBinanceMarketOrder(config, {
    quantity,
    side: orderSide,
    symbol: input.symbol,
  });
  const positionAfterEntry = await fetchBinanceTrackedPosition(
    config,
    input.symbol,
  );

  if (!positionAfterEntry) {
    return {
      order: buildExecutionOrder({
        action: "ENTRY_STAGE",
        fallbackMarkPrice: markPrice,
        order,
        position: null,
        stageZone: stageCandidate.stage.zone,
      }),
      protectionOrders: null,
      reason:
        "The entry order was accepted by Binance testnet, but TrendX could not confirm the resulting position state.",
      success: false,
      symbol: input.symbol,
      testnet: true,
    };
  }

  const protectionSync = await syncProtectionOrders({
    config,
    pair,
    position: positionAfterEntry,
    symbol: input.symbol,
    tradingRules,
  });
  const entryOrderPayload = buildExecutionOrder({
    action: "ENTRY_STAGE",
    fallbackMarkPrice: markPrice,
    order,
    position: positionAfterEntry,
    stageZone: stageCandidate.stage.zone,
  });

  if (!protectionSync.success) {
    return {
      order: entryOrderPayload,
      protectionOrders: null,
      reason: protectionSync.reason ?? "Protection order setup failed.",
      success: false,
      symbol: input.symbol,
      testnet: true,
    };
  }

  const [accountAfterEntry, refreshedPosition] = await Promise.all([
    fetchBinanceAccountInformation(config),
    fetchBinanceTrackedPosition(config, input.symbol),
  ]);
  const finalPosition = refreshedPosition ?? positionAfterEntry;

  await persistEntryExecution({
    account: accountAfterEntry,
    executionConfig: overviewResult.overview.executionConfig,
    order,
    overviewGeneratedAt: overviewResult.overview.generatedAt,
    overviewReason: overviewResult.reason,
    pair,
    position: finalPosition,
    protectionOrders: {
      stopLoss: protectionSync.stopLoss,
      takeProfit: protectionSync.takeProfit,
    },
    stageZone: stageCandidate.stage.zone,
  });

  return {
    order: buildExecutionOrder({
      action: "ENTRY_STAGE",
      fallbackMarkPrice: markPrice,
      order,
      position: finalPosition,
      stageZone: stageCandidate.stage.zone,
    }),
    protectionOrders: buildProtectionOrdersOutput({
      stopLoss: protectionSync.stopLoss,
      takeProfit: protectionSync.takeProfit,
    }),
    reason: protectionSync.reason
      ? `${input.symbol} ${stageCandidate.stage.zone} 档已在 Binance testnet 以市价执行。${protectionSync.reason}`
      : `${input.symbol} ${stageCandidate.stage.zone} 档已在 Binance testnet 以市价执行，止损与止盈保护单已同步刷新。`,
    success: true,
    symbol: input.symbol,
    testnet: true,
  };
}

export async function closeTrackedPosition(
  input: ClosePositionInput,
): Promise<ExecutionMutationOutput> {
  const config = getBinanceFuturesConfig();

  if (!config) {
    return buildFailureOutput(input.symbol, REFERENCE_RISK_REASON);
  }

  if (config.mode !== "testnet") {
    return buildFailureOutput(input.symbol, TESTNET_ONLY_REASON);
  }

  const [position, tradingRules] = await Promise.all([
    fetchBinanceTrackedPosition(config, input.symbol),
    fetchBinanceSymbolTradingRules(config, input.symbol),
  ]);

  if (!position) {
    return buildFailureOutput(
      input.symbol,
      "There is no open Binance testnet position to close for this symbol.",
    );
  }

  const quantity = roundDownToStepSize(
    position.absoluteQuantity,
    tradingRules.quantityStepSize,
  );

  if (quantity < tradingRules.minQuantity) {
    return buildFailureOutput(
      input.symbol,
      `Position quantity ${quantity} is below Binance minimum quantity ${tradingRules.minQuantity}.`,
    );
  }

  await Promise.all([
    cancelBinanceAllOpenOrders(config, input.symbol),
    cancelBinanceAllAlgoOpenOrders(config, input.symbol),
  ]);

  const closeSide = getCloseOrderSide(position.side);

  if (!closeSide) {
    return buildFailureOutput(
      input.symbol,
      "TrendX could not determine the correct Binance close side for this position.",
    );
  }

  const order = await placeBinanceMarketOrder(config, {
    quantity,
    reduceOnly: true,
    side: closeSide,
    symbol: input.symbol,
  });
  const [accountAfterClose, positionAfterClose] = await Promise.all([
    fetchBinanceAccountInformation(config),
    fetchBinanceTrackedPosition(config, input.symbol),
  ]);

  await persistCloseExecution({
    account: accountAfterClose,
    closedAt: new Date().toISOString(),
    closeOrder: order,
    positionAfterClose,
    positionBeforeClose: position,
    symbol: input.symbol,
  });

  return {
    order: buildExecutionOrder({
      action: "CLOSE_POSITION",
      fallbackMarkPrice: position.markPrice,
      order,
      position: positionAfterClose,
      stageZone: null,
    }),
    protectionOrders: null,
    reason: positionAfterClose
      ? `${input.symbol} close order was sent, but Binance still reports residual exposure on the symbol.`
      : `${input.symbol} 持仓已在 Binance testnet 以市价平掉。`,
    success: true,
    symbol: input.symbol,
    testnet: true,
  };
}
