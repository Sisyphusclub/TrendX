import { createHmac } from "node:crypto";

import { logger } from "@trendx/logs";
import { z } from "zod";

import type { DashboardOverview, DashboardPair } from "../../dashboard/types";

const trackedSymbols = ["BTCUSDT", "ETHUSDT"] as const;
const trackedSymbolSchema = z.enum(trackedSymbols);

const binanceEnvSchema = z.object({
  TRENDX_BINANCE_API_BASE_URL: z.string().url().optional(),
  TRENDX_BINANCE_API_KEY: z.string().optional(),
  TRENDX_BINANCE_API_SECRET: z.string().optional(),
  TRENDX_BINANCE_ENV: z.enum(["testnet", "live"]).default("testnet"),
  TRENDX_BINANCE_RECV_WINDOW: z.coerce
    .number()
    .int()
    .positive()
    .max(60_000)
    .default(5_000),
});

const binanceAccountPositionSchema = z.object({
  notional: z.string(),
  positionAmt: z.string(),
  positionSide: z.enum(["BOTH", "LONG", "SHORT"]),
  symbol: z.string().min(1),
  unrealizedProfit: z.string(),
});

const binanceAccountInformationSchema = z.object({
  availableBalance: z.string(),
  positions: z.array(binanceAccountPositionSchema),
  totalInitialMargin: z.string(),
  totalMarginBalance: z.string(),
  totalUnrealizedProfit: z.string(),
});
const binanceMarkPriceSchema = z.object({
  markPrice: z.string(),
  symbol: z.string().min(1),
});
const binanceExchangeInfoSchema = z.object({
  symbols: z.array(
    z.object({
      filters: z.array(z.object({ filterType: z.string() }).passthrough()),
      status: z.string(),
      symbol: z.string().min(1),
    }),
  ),
});
const binanceLeverageResponseSchema = z.object({
  leverage: z.coerce.number(),
  maxNotionalValue: z.string(),
  symbol: z.string().min(1),
});
const binanceAckResponseSchema = z
  .object({
    code: z.coerce.number().optional(),
    msg: z.string().optional(),
  })
  .passthrough();
const binanceOrderResponseSchema = z.object({
  avgPrice: z.string().optional(),
  clientOrderId: z.string(),
  executedQty: z.string(),
  orderId: z.union([z.string(), z.number()]),
  side: z.enum(["BUY", "SELL"]),
  status: z.string(),
  symbol: z.string().min(1),
});
const binancePositionRiskSchema = z.object({
  entryPrice: z.string(),
  markPrice: z.string(),
  notional: z.string(),
  positionAmt: z.string(),
  positionSide: z.enum(["BOTH", "LONG", "SHORT"]),
  symbol: z.string().min(1),
  unRealizedProfit: z.string(),
  updateTime: z.coerce.number().optional(),
});
const binanceAlgoOrderResponseSchema = z.object({
  algoId: z.union([z.string(), z.number()]),
  algoStatus: z.string().optional(),
  clientAlgoId: z.string(),
  orderType: z.enum(["STOP_MARKET", "TAKE_PROFIT_MARKET"]).optional(),
  side: z.enum(["BUY", "SELL"]),
  stopPrice: z.string().optional(),
  symbol: z.string().min(1),
  workingType: z.string().optional(),
});

export interface BinanceFuturesConfig {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  mode: "testnet" | "live";
  recvWindow: number;
}

export interface BinanceDashboardAccountState {
  accountRisk: DashboardOverview["accountRisk"];
  positionsBySymbol: Record<
    DashboardPair["symbol"],
    Pick<DashboardPair["currentPosition"], "pnl" | "side" | "sizeUsd">
  >;
  reason: string;
}

export interface BinanceFuturesSymbolTradingRules {
  minNotionalUsd: number | null;
  minQuantity: number;
  quantityStepSize: number;
  status: string;
}

export interface BinancePlacedOrder {
  averagePrice: number;
  clientOrderId: string;
  executedQuantity: number;
  orderId: string;
  side: "BUY" | "SELL";
  status: string;
  symbol: string;
}

export interface BinancePlacedAlgoOrder {
  algoId: string;
  algoStatus: string;
  clientAlgoId: string;
  side: "BUY" | "SELL";
  symbol: string;
  triggerPrice: number;
  type: "STOP_MARKET" | "TAKE_PROFIT_MARKET";
  workingType: string;
}

export interface BinanceTrackedPosition {
  absoluteQuantity: number;
  entryPrice: number;
  markPrice: number;
  notionalUsd: number;
  quantity: number;
  side: DashboardPair["currentPosition"]["side"];
  symbol: DashboardPair["symbol"];
  unrealizedPnl: number;
  updateTime: number;
}

export type BinanceAccountInformation = z.infer<
  typeof binanceAccountInformationSchema
>;

interface PositionAggregate {
  longNotionalUsd: number;
  pnl: number;
  shortNotionalUsd: number;
}

function toNumber(value: string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function buildBinanceBaseUrl(mode: BinanceFuturesConfig["mode"]): string {
  if (mode === "testnet") {
    return "https://demo-fapi.binance.com";
  }

  return "https://fapi.binance.com";
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function signQuery(
  config: BinanceFuturesConfig,
  params: URLSearchParams,
): string {
  return createHmac("sha256", config.apiSecret)
    .update(params.toString())
    .digest("hex");
}

function isTrackedSymbol(value: string): value is DashboardPair["symbol"] {
  return trackedSymbolSchema.safeParse(value).success;
}

function isPositionActive(
  position: z.infer<typeof binanceAccountPositionSchema>,
): boolean {
  return (
    Math.abs(toNumber(position.positionAmt)) > 0 ||
    Math.abs(toNumber(position.notional)) > 0
  );
}

function derivePositionSide(
  aggregate: PositionAggregate,
): DashboardPair["currentPosition"]["side"] {
  if (aggregate.longNotionalUsd === 0 && aggregate.shortNotionalUsd === 0) {
    return "FLAT";
  }

  if (aggregate.shortNotionalUsd > aggregate.longNotionalUsd) {
    return "SHORT";
  }

  return "LONG";
}

function buildTrackedPositionsBySymbol(
  positions: Array<z.infer<typeof binanceAccountPositionSchema>>,
): BinanceDashboardAccountState["positionsBySymbol"] {
  const aggregates = new Map<DashboardPair["symbol"], PositionAggregate>();

  for (const symbol of trackedSymbols) {
    aggregates.set(symbol, {
      longNotionalUsd: 0,
      pnl: 0,
      shortNotionalUsd: 0,
    });
  }

  for (const position of positions) {
    if (!isTrackedSymbol(position.symbol) || !isPositionActive(position)) {
      continue;
    }

    const aggregate = aggregates.get(position.symbol);

    if (!aggregate) {
      continue;
    }

    const notionalUsd = Math.abs(toNumber(position.notional));
    const side =
      position.positionSide === "LONG"
        ? "LONG"
        : position.positionSide === "SHORT"
          ? "SHORT"
          : toNumber(position.notional) < 0
            ? "SHORT"
            : "LONG";

    if (side === "SHORT") {
      aggregate.shortNotionalUsd += notionalUsd;
    } else {
      aggregate.longNotionalUsd += notionalUsd;
    }

    aggregate.pnl += toNumber(position.unrealizedProfit);
  }

  return Object.fromEntries(
    trackedSymbols.map((symbol) => {
      const aggregate = aggregates.get(symbol);

      if (!aggregate) {
        return [
          symbol,
          {
            pnl: 0,
            side: "FLAT",
            sizeUsd: 0,
          },
        ];
      }

      const side = derivePositionSide(aggregate);
      const sizeUsd =
        side === "SHORT"
          ? aggregate.shortNotionalUsd
          : aggregate.longNotionalUsd;

      return [
        symbol,
        {
          pnl: Number(aggregate.pnl.toFixed(2)),
          side,
          sizeUsd: Number(sizeUsd.toFixed(2)),
        },
      ];
    }),
  ) as BinanceDashboardAccountState["positionsBySymbol"];
}

function buildAccountRisk(
  account: z.infer<typeof binanceAccountInformationSchema>,
): DashboardOverview["accountRisk"] {
  const equity = toNumber(account.totalMarginBalance);
  const activePositions = account.positions.filter(isPositionActive);
  const grossNotionalUsd = activePositions.reduce(
    (sum, position) => sum + Math.abs(toNumber(position.notional)),
    0,
  );

  return {
    availableMargin: Number(toNumber(account.availableBalance).toFixed(2)),
    dailyPnl: 0,
    equity: Number(equity.toFixed(2)),
    exposurePct:
      equity > 0 ? Number(((grossNotionalUsd / equity) * 100).toFixed(2)) : 0,
    openPositionCount: activePositions.length,
    usedMargin: Number(toNumber(account.totalInitialMargin).toFixed(2)),
  };
}

async function parseBinanceErrorResponse(
  response: Response,
): Promise<{ code: number | null; message: string }> {
  const responseText = await response.text();

  try {
    const parsed = JSON.parse(responseText) as {
      code?: unknown;
      msg?: unknown;
    };

    return {
      code: typeof parsed.code === "number" ? parsed.code : null,
      message:
        typeof parsed.msg === "string" && parsed.msg.length > 0
          ? parsed.msg
          : responseText,
    };
  } catch {
    return {
      code: null,
      message: responseText,
    };
  }
}

async function fetchBinanceJson<TData>(params: {
  config: BinanceFuturesConfig;
  path: string;
  responseSchema: z.ZodSchema<TData>;
  searchParams?: URLSearchParams;
}): Promise<TData> {
  const { config, path, responseSchema } = params;
  const url = new URL(`${config.apiBaseUrl}${path}`);

  if (params.searchParams) {
    url.search = params.searchParams.toString();
  }

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    const errorPayload = await parseBinanceErrorResponse(response);

    throw new Error(
      `Binance request failed with status ${response.status}: ${errorPayload.message}`,
    );
  }

  return responseSchema.parse(await response.json());
}

async function fetchSignedBinanceJson<TData>(params: {
  config: BinanceFuturesConfig;
  method: "DELETE" | "GET" | "POST";
  path: string;
  responseSchema: z.ZodSchema<TData>;
  searchParams?: URLSearchParams;
}): Promise<TData> {
  const { config, method, path, responseSchema } = params;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const searchParams = new URLSearchParams(params.searchParams);

    searchParams.set("recvWindow", String(config.recvWindow));
    searchParams.set("timestamp", String(Date.now()));

    const signature = signQuery(config, searchParams);
    const url = `${config.apiBaseUrl}${path}?${searchParams.toString()}&signature=${signature}`;

    try {
      const response = await fetch(url, {
        headers: {
          "X-MBX-APIKEY": config.apiKey,
        },
        method,
      });

      if (response.ok) {
        const data = await response.json();

        return responseSchema.parse(data);
      }

      const errorPayload = await parseBinanceErrorResponse(response);
      const shouldRetry = response.status === 429 || response.status >= 500;

      if (shouldRetry && attempt < maxAttempts) {
        const retryDelayMs = 300 * 2 ** (attempt - 1);

        logger.warn(
          "Retrying Binance account request after transient failure",
          {
            attempt,
            path,
            retryDelayMs,
            status: response.status,
          },
        );
        await sleep(retryDelayMs);
        continue;
      }

      throw new Error(
        `Binance request failed with status ${response.status}: ${errorPayload.message}${errorPayload.code === null ? "" : ` (${errorPayload.code})`}`,
      );
    } catch (error) {
      if (attempt < maxAttempts) {
        const retryDelayMs = 300 * 2 ** (attempt - 1);

        logger.warn("Retrying Binance account request after fetch error", {
          attempt,
          error: error instanceof Error ? error.message : String(error),
          path,
          retryDelayMs,
        });
        await sleep(retryDelayMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Binance request exhausted retries for ${path}.`);
}

export function getBinanceFuturesConfig(): BinanceFuturesConfig | null {
  const env = binanceEnvSchema.parse(process.env);
  const apiKey = env.TRENDX_BINANCE_API_KEY?.trim() ?? "";
  const apiSecret = env.TRENDX_BINANCE_API_SECRET?.trim() ?? "";

  if (!apiKey || !apiSecret) {
    return null;
  }

  return {
    apiBaseUrl:
      env.TRENDX_BINANCE_API_BASE_URL?.trim() ||
      buildBinanceBaseUrl(env.TRENDX_BINANCE_ENV),
    apiKey,
    apiSecret,
    mode: env.TRENDX_BINANCE_ENV,
    recvWindow: env.TRENDX_BINANCE_RECV_WINDOW,
  };
}

export function roundDownToStepSize(value: number, stepSize: number): number {
  if (stepSize <= 0) {
    return value;
  }

  const steps = Math.floor(value / stepSize);

  return Number((steps * stepSize).toFixed(8));
}

export function getSignedPositionQuantity(
  position: z.infer<typeof binanceAccountPositionSchema>,
): number {
  const quantity = Math.abs(toNumber(position.positionAmt));

  if (position.positionSide === "SHORT") {
    return -quantity;
  }

  if (position.positionSide === "LONG") {
    return quantity;
  }

  return toNumber(position.positionAmt);
}

export async function fetchBinanceAccountInformation(
  config: BinanceFuturesConfig,
): Promise<BinanceAccountInformation> {
  return await fetchSignedBinanceJson({
    config,
    method: "GET",
    path: "/fapi/v3/account",
    responseSchema: binanceAccountInformationSchema,
  });
}

export async function fetchBinanceDashboardAccountState(
  config: BinanceFuturesConfig,
): Promise<BinanceDashboardAccountState> {
  const account = await fetchBinanceAccountInformation(config);

  return {
    accountRisk: buildAccountRisk(account),
    positionsBySymbol: buildTrackedPositionsBySymbol(account.positions),
    reason:
      config.mode === "testnet"
        ? "Binance USD-M Futures testnet account risk synced."
        : "Binance USD-M Futures live account risk synced.",
  };
}

export async function fetchBinanceMarkPrice(
  config: BinanceFuturesConfig,
  symbol: DashboardPair["symbol"],
): Promise<number> {
  const data = await fetchBinanceJson({
    config,
    path: "/fapi/v1/premiumIndex",
    responseSchema: binanceMarkPriceSchema,
    searchParams: new URLSearchParams({
      symbol,
    }),
  });

  return toNumber(data.markPrice);
}

export async function fetchBinanceSymbolTradingRules(
  config: BinanceFuturesConfig,
  symbol: DashboardPair["symbol"],
): Promise<BinanceFuturesSymbolTradingRules> {
  const exchangeInfo = await fetchBinanceJson({
    config,
    path: "/fapi/v1/exchangeInfo",
    responseSchema: binanceExchangeInfoSchema,
  });
  const symbolInfo = exchangeInfo.symbols.find(
    (candidate) => candidate.symbol === symbol,
  );

  if (!symbolInfo) {
    throw new Error(`Binance exchangeInfo did not include ${symbol}.`);
  }

  const marketLotSizeFilter =
    symbolInfo.filters.find(
      (filter) => filter.filterType === "MARKET_LOT_SIZE",
    ) ?? symbolInfo.filters.find((filter) => filter.filterType === "LOT_SIZE");
  const minNotionalFilter = symbolInfo.filters.find(
    (filter) =>
      filter.filterType === "MIN_NOTIONAL" || filter.filterType === "NOTIONAL",
  );

  if (!marketLotSizeFilter) {
    throw new Error(
      `Binance exchangeInfo is missing lot size data for ${symbol}.`,
    );
  }

  const minQuantityRaw = marketLotSizeFilter.minQty;
  const stepSizeRaw = marketLotSizeFilter.stepSize;
  const minNotionalRaw =
    minNotionalFilter?.notional ?? minNotionalFilter?.minNotional ?? null;
  const minQuantity =
    typeof minQuantityRaw === "string" ? toNumber(minQuantityRaw) : 0;
  const quantityStepSize =
    typeof stepSizeRaw === "string" ? toNumber(stepSizeRaw) : 0;

  if (minQuantity <= 0 || quantityStepSize <= 0) {
    throw new Error(
      `Binance exchangeInfo returned invalid lot size data for ${symbol}.`,
    );
  }

  return {
    minNotionalUsd:
      typeof minNotionalRaw === "string" ? toNumber(minNotionalRaw) : null,
    minQuantity,
    quantityStepSize,
    status: symbolInfo.status,
  };
}

export async function setBinanceMarginTypeToCross(
  config: BinanceFuturesConfig,
  symbol: DashboardPair["symbol"],
): Promise<void> {
  try {
    await fetchSignedBinanceJson({
      config,
      method: "POST",
      path: "/fapi/v1/marginType",
      responseSchema: binanceAckResponseSchema,
      searchParams: new URLSearchParams({
        marginType: "CROSSED",
        symbol,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("No need to change margin type") ||
      message.includes("(-4046)")
    ) {
      return;
    }

    throw error;
  }
}

export async function setBinanceSymbolLeverage(
  config: BinanceFuturesConfig,
  params: {
    leverage: number;
    symbol: DashboardPair["symbol"];
  },
): Promise<void> {
  await fetchSignedBinanceJson({
    config,
    method: "POST",
    path: "/fapi/v1/leverage",
    responseSchema: binanceLeverageResponseSchema,
    searchParams: new URLSearchParams({
      leverage: String(params.leverage),
      symbol: params.symbol,
    }),
  });
}

export async function placeBinanceMarketOrder(
  config: BinanceFuturesConfig,
  params: {
    quantity: number;
    reduceOnly?: boolean;
    side: "BUY" | "SELL";
    symbol: DashboardPair["symbol"];
  },
): Promise<BinancePlacedOrder> {
  const searchParams = new URLSearchParams({
    newOrderRespType: "RESULT",
    quantity: String(params.quantity),
    side: params.side,
    symbol: params.symbol,
    type: "MARKET",
  });

  if (params.reduceOnly) {
    searchParams.set("reduceOnly", "true");
  }

  const response = await fetchSignedBinanceJson({
    config,
    method: "POST",
    path: "/fapi/v1/order",
    responseSchema: binanceOrderResponseSchema,
    searchParams,
  });

  return {
    averagePrice: toNumber(response.avgPrice ?? "0"),
    clientOrderId: response.clientOrderId,
    executedQuantity: toNumber(response.executedQty),
    orderId: String(response.orderId),
    side: response.side,
    status: response.status,
    symbol: response.symbol,
  };
}

function getSignedPositionQuantityFromRisk(
  position: z.infer<typeof binancePositionRiskSchema>,
): number {
  const quantity = Math.abs(toNumber(position.positionAmt));

  if (position.positionSide === "SHORT") {
    return -quantity;
  }

  if (position.positionSide === "LONG") {
    return quantity;
  }

  return toNumber(position.positionAmt);
}

export async function fetchBinanceTrackedPosition(
  config: BinanceFuturesConfig,
  symbol: DashboardPair["symbol"],
): Promise<BinanceTrackedPosition | null> {
  const positions = await fetchSignedBinanceJson({
    config,
    method: "GET",
    path: "/fapi/v3/positionRisk",
    responseSchema: z.array(binancePositionRiskSchema),
    searchParams: new URLSearchParams({
      symbol,
    }),
  });
  const activePositions = positions.filter(
    (position) =>
      position.symbol === symbol &&
      Math.abs(getSignedPositionQuantityFromRisk(position)) > 0,
  );

  if (!activePositions.length) {
    return null;
  }

  const quantity = activePositions.reduce(
    (sum, position) => sum + getSignedPositionQuantityFromRisk(position),
    0,
  );

  if (quantity === 0) {
    return null;
  }

  const referencePosition =
    activePositions.find(
      (position) =>
        Math.abs(getSignedPositionQuantityFromRisk(position)) ===
        Math.abs(quantity),
    ) ?? activePositions[0];

  if (!referencePosition || !isTrackedSymbol(referencePosition.symbol)) {
    return null;
  }

  const notionalUsd = activePositions.reduce(
    (sum, position) => sum + Math.abs(toNumber(position.notional)),
    0,
  );
  const unrealizedPnl = activePositions.reduce(
    (sum, position) => sum + toNumber(position.unRealizedProfit),
    0,
  );

  return {
    absoluteQuantity: Number(Math.abs(quantity).toFixed(8)),
    entryPrice: toNumber(referencePosition.entryPrice),
    markPrice: toNumber(referencePosition.markPrice),
    notionalUsd: Number(notionalUsd.toFixed(2)),
    quantity: Number(quantity.toFixed(8)),
    side: quantity > 0 ? "LONG" : "SHORT",
    symbol: referencePosition.symbol,
    unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
    updateTime: referencePosition.updateTime ?? Date.now(),
  };
}

export async function cancelBinanceAllOpenOrders(
  config: BinanceFuturesConfig,
  symbol: DashboardPair["symbol"],
): Promise<void> {
  await fetchSignedBinanceJson({
    config,
    method: "DELETE",
    path: "/fapi/v1/allOpenOrders",
    responseSchema: binanceAckResponseSchema,
    searchParams: new URLSearchParams({
      symbol,
    }),
  });
}

export async function cancelBinanceAllAlgoOpenOrders(
  config: BinanceFuturesConfig,
  symbol: DashboardPair["symbol"],
): Promise<void> {
  await fetchSignedBinanceJson({
    config,
    method: "DELETE",
    path: "/fapi/v1/algoOpenOrders",
    responseSchema: binanceAckResponseSchema,
    searchParams: new URLSearchParams({
      symbol,
    }),
  });
}

export async function placeBinanceCloseAllProtectionOrder(
  config: BinanceFuturesConfig,
  params: {
    side: "BUY" | "SELL";
    symbol: DashboardPair["symbol"];
    triggerPrice: number;
    type: "STOP_MARKET" | "TAKE_PROFIT_MARKET";
  },
): Promise<BinancePlacedAlgoOrder> {
  const response = await fetchSignedBinanceJson({
    config,
    method: "POST",
    path: "/fapi/v1/algoOrder",
    responseSchema: binanceAlgoOrderResponseSchema,
    searchParams: new URLSearchParams({
      algoType: "CONDITIONAL",
      closePosition: "true",
      newOrderRespType: "RESULT",
      priceProtect: "FALSE",
      side: params.side,
      stopPrice: String(params.triggerPrice),
      symbol: params.symbol,
      type: params.type,
      workingType: "MARK_PRICE",
    }),
  });

  return {
    algoId: String(response.algoId),
    algoStatus: response.algoStatus ?? "NEW",
    clientAlgoId: response.clientAlgoId,
    side: response.side,
    symbol: response.symbol,
    triggerPrice: toNumber(response.stopPrice ?? String(params.triggerPrice)),
    type: response.orderType ?? params.type,
    workingType: response.workingType ?? "MARK_PRICE",
  };
}
