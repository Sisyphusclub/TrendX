import { logger } from "@trendx/logs";

import type { DashboardPair, GetDashboardOverviewOutput } from "../types";

import { getDashboardOverviewOutputSchema } from "../types";
import {
  type CoinankCandle,
  type CoinankDashboardConfig,
  type CoinankLiquidationPoint,
  type CoinankPairSnapshot,
  fetchCoinankCvdBiasPct,
  fetchCoinankPairSnapshot,
  getCoinankDashboardConfig,
} from "./coinank-client";
import {
  buildSeededDashboardOverview,
  buildSeededDashboardPair,
} from "./seed-overview";

const CONFIRMATION_THRESHOLD = 3;
const DEFAULT_REFERENCE_EQUITY = 100_000;
const OI_CONFIRMATION_THRESHOLD_PCT = 0.5;
const PRICE_CONFIRMATION_THRESHOLD_PCT = 0.35;

function calculatePctChange(current: number, previous: number): number {
  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

function roundPrice(symbol: DashboardPair["symbol"], value: number): number {
  if (symbol === "BTCUSDT") {
    return Math.round(value);
  }

  return Number(value.toFixed(2));
}

function getLatestCandle(candles: CoinankCandle[]): CoinankCandle | null {
  return candles[candles.length - 1] ?? null;
}

function getAnchorCandle(
  candles: CoinankCandle[],
  offset: number,
): CoinankCandle | null {
  const anchorIndex = Math.max(candles.length - 1 - offset, 0);

  return candles[anchorIndex] ?? null;
}

function getCompletedCandles(candles: CoinankCandle[]): CoinankCandle[] {
  if (candles.length <= 1) {
    return candles;
  }

  return candles.slice(0, -1);
}

function getRecentCandles(
  candles: CoinankCandle[],
  count: number,
): CoinankCandle[] {
  return candles.slice(Math.max(candles.length - count, 0));
}

function deriveTrendDirection(
  oiChangePct: number,
  priceChangePct: number,
): DashboardPair["trendDirection"] {
  if (
    oiChangePct > OI_CONFIRMATION_THRESHOLD_PCT &&
    priceChangePct > PRICE_CONFIRMATION_THRESHOLD_PCT
  ) {
    return "BULLISH";
  }

  if (
    oiChangePct > OI_CONFIRMATION_THRESHOLD_PCT &&
    priceChangePct < -PRICE_CONFIRMATION_THRESHOLD_PCT
  ) {
    return "BEARISH";
  }

  return "NEUTRAL";
}

function buildChecklist(matches: Array<boolean>): DashboardPair["checklist"] {
  return [
    {
      key: "oi",
      label: "Open interest still expanding",
      matched: matches[0] ?? false,
    },
    {
      key: "cvd",
      label: "CVD agrees with bias",
      matched: matches[1] ?? false,
    },
    {
      key: "funding",
      label: "Funding remains tradable",
      matched: matches[2] ?? false,
    },
    {
      key: "largeOrders",
      label: "Large resting orders appear",
      matched: matches[3] ?? false,
    },
    {
      key: "liquidationSweep",
      label: "Nearby liquidation sweep confirmed",
      matched: matches[4] ?? false,
    },
    {
      key: "aggressiveFlow",
      label: "Aggressive flow supports entry",
      matched: matches[5] ?? false,
    },
  ];
}

function formatSignedPct(value: number): string {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function selectOrderBlock(
  symbol: DashboardPair["symbol"],
  candles: CoinankCandle[],
  trendDirection: DashboardPair["trendDirection"],
): DashboardPair["orderBlock"] {
  const completedCandles = getCompletedCandles(candles);
  const searchWindow = getRecentCandles(completedCandles, 12).slice().reverse();

  const selectedCandle = searchWindow.find((candle) => {
    if (trendDirection === "BULLISH") {
      return candle.close < candle.open;
    }

    if (trendDirection === "BEARISH") {
      return candle.close > candle.open;
    }

    return false;
  });

  const fallbackCandle =
    selectedCandle ??
    getLatestCandle(completedCandles) ??
    getLatestCandle(candles);

  if (!fallbackCandle) {
    return {
      high: roundPrice(symbol, 0),
      low: roundPrice(symbol, 0),
      mid: roundPrice(symbol, 0),
    };
  }

  const bodyHigh = Math.max(fallbackCandle.open, fallbackCandle.close);
  const bodyLow = Math.min(fallbackCandle.open, fallbackCandle.close);
  const high =
    trendDirection === "BEARISH"
      ? fallbackCandle.high
      : Math.max(bodyHigh, bodyLow);
  const low =
    trendDirection === "BULLISH"
      ? fallbackCandle.low
      : Math.min(bodyHigh, bodyLow);
  const normalizedHigh = Math.max(high, low);
  const normalizedLow = Math.min(high, low);
  const mid = (normalizedHigh + normalizedLow) / 2;

  return {
    high: roundPrice(symbol, normalizedHigh),
    low: roundPrice(symbol, normalizedLow),
    mid: roundPrice(symbol, mid),
  };
}

function isFundingTradable(
  trendDirection: DashboardPair["trendDirection"],
  fundingRatePct: number,
): boolean {
  if (Math.abs(fundingRatePct) > 0.08) {
    return false;
  }

  if (trendDirection === "BULLISH") {
    return fundingRatePct < 0.04;
  }

  if (trendDirection === "BEARISH") {
    return fundingRatePct > -0.04;
  }

  return Math.abs(fundingRatePct) < 0.03;
}

function matchesLiquidationSweep(
  trendDirection: DashboardPair["trendDirection"],
  liquidations: CoinankLiquidationPoint[],
): boolean {
  const recentLiquidations = liquidations.slice(
    Math.max(liquidations.length - 3, 0),
  );
  const longLiquidations = recentLiquidations.reduce(
    (sum, item) => sum + item.longTurnover,
    0,
  );
  const shortLiquidations = recentLiquidations.reduce(
    (sum, item) => sum + item.shortTurnover,
    0,
  );

  if (trendDirection === "BULLISH") {
    return longLiquidations > shortLiquidations * 1.15;
  }

  if (trendDirection === "BEARISH") {
    return shortLiquidations > longLiquidations * 1.15;
  }

  return false;
}

function isInOrderBlockRange(
  orderBlock: DashboardPair["orderBlock"],
  trendDirection: DashboardPair["trendDirection"],
  latestPrice: number,
): boolean {
  if (trendDirection === "BULLISH") {
    return (
      latestPrice >= orderBlock.low * 0.995 &&
      latestPrice <= orderBlock.high * 1.003
    );
  }

  if (trendDirection === "BEARISH") {
    return (
      latestPrice >= orderBlock.low * 0.997 &&
      latestPrice <= orderBlock.high * 1.005
    );
  }

  return false;
}

function buildProtectionTargets(
  symbol: DashboardPair["symbol"],
  candles: CoinankCandle[],
  orderBlock: DashboardPair["orderBlock"],
  trendDirection: DashboardPair["trendDirection"],
  latestPrice: number,
): Pick<DashboardPair, "stopLoss" | "takeProfitOne" | "takeProfitTwo"> {
  const shortWindow = getRecentCandles(candles, 12);
  const longWindow = getRecentCandles(candles, 24);
  const highestRecentPrice = Math.max(
    ...shortWindow.map((candle) => candle.high),
  );
  const lowestRecentPrice = Math.min(
    ...shortWindow.map((candle) => candle.low),
  );
  const highestExtendedPrice = Math.max(
    ...longWindow.map((candle) => candle.high),
  );
  const lowestExtendedPrice = Math.min(
    ...longWindow.map((candle) => candle.low),
  );

  if (trendDirection === "BEARISH") {
    const stopLoss = roundPrice(symbol, orderBlock.high * 1.002);
    const takeProfitOne = roundPrice(
      symbol,
      Math.min(lowestRecentPrice, latestPrice * 0.99),
    );
    const takeProfitTwo = roundPrice(
      symbol,
      Math.min(lowestExtendedPrice, takeProfitOne * 0.99),
    );

    return {
      stopLoss,
      takeProfitOne,
      takeProfitTwo,
    };
  }

  const stopLoss = roundPrice(symbol, orderBlock.low * 0.998);
  const takeProfitOne = roundPrice(
    symbol,
    Math.max(highestRecentPrice, latestPrice * 1.01),
  );
  const takeProfitTwo = roundPrice(
    symbol,
    Math.max(highestExtendedPrice, takeProfitOne * 1.01),
  );

  return {
    stopLoss,
    takeProfitOne,
    takeProfitTwo,
  };
}

async function buildLiveDashboardPair(
  config: CoinankDashboardConfig,
  snapshot: CoinankPairSnapshot,
): Promise<DashboardPair> {
  const latestPriceCandle = getLatestCandle(snapshot.priceCandles);
  const latestOpenInterestCandle = getLatestCandle(
    snapshot.openInterestCandles,
  );
  const latestFundingCandle = getLatestCandle(snapshot.fundingRateCandles);
  const priceAnchor = getAnchorCandle(snapshot.priceCandles, 12);
  const openInterestAnchor = getAnchorCandle(snapshot.openInterestCandles, 12);

  if (
    !latestPriceCandle ||
    !latestOpenInterestCandle ||
    !latestFundingCandle ||
    !priceAnchor ||
    !openInterestAnchor
  ) {
    throw new Error(
      `Coinank did not return enough candle data for ${snapshot.symbol}.`,
    );
  }

  const latestPrice = latestPriceCandle.close;
  const priceChangePct = calculatePctChange(latestPrice, priceAnchor.close);
  const oiChangePct = calculatePctChange(
    latestOpenInterestCandle.close,
    openInterestAnchor.close,
  );
  const trendDirection = deriveTrendDirection(oiChangePct, priceChangePct);
  const fundingRatePct = latestFundingCandle.close;
  const takerTurnover =
    snapshot.longShortRealtime.buyTradeTurnover +
    snapshot.longShortRealtime.sellTradeTurnover;
  const takerBiasPct =
    takerTurnover === 0
      ? 0
      : ((snapshot.longShortRealtime.buyTradeTurnover -
          snapshot.longShortRealtime.sellTradeTurnover) /
          takerTurnover) *
        100;
  const cvdBiasPct =
    (await fetchCoinankCvdBiasPct(config, snapshot.symbol)) ?? takerBiasPct;
  const orderBlock = selectOrderBlock(
    snapshot.symbol,
    snapshot.priceCandles,
    trendDirection,
  );
  const oiMatched =
    trendDirection !== "NEUTRAL" && oiChangePct > OI_CONFIRMATION_THRESHOLD_PCT;
  const cvdMatched =
    trendDirection === "BULLISH"
      ? cvdBiasPct > 4
      : trendDirection === "BEARISH"
        ? cvdBiasPct < -4
        : false;
  const fundingMatched = isFundingTradable(trendDirection, fundingRatePct);
  const liquidationMatched = matchesLiquidationSweep(
    trendDirection,
    snapshot.liquidations,
  );
  const aggressiveFlowMatched =
    trendDirection === "BULLISH"
      ? takerBiasPct > 6
      : trendDirection === "BEARISH"
        ? takerBiasPct < -6
        : false;
  const confirmationMatches = [
    oiMatched,
    cvdMatched,
    fundingMatched,
    false,
    liquidationMatched,
    aggressiveFlowMatched,
  ];
  const confirmationCount = confirmationMatches.filter(Boolean).length;
  const inOrderBlockRange = isInOrderBlockRange(
    orderBlock,
    trendDirection,
    latestPrice,
  );
  const action: DashboardPair["action"] =
    trendDirection !== "NEUTRAL" &&
    inOrderBlockRange &&
    confirmationCount >= CONFIRMATION_THRESHOLD
      ? "ENTRY"
      : "WAIT";
  const riskLabel =
    trendDirection === "NEUTRAL"
      ? "No directional edge"
      : action === "ENTRY"
        ? trendDirection === "BULLISH"
          ? "Aligned long continuation"
          : "Aligned short continuation"
        : inOrderBlockRange
          ? "Low conviction at the zone"
          : "Trend valid, waiting for zone";
  const executionStatus: DashboardPair["executionStatus"] =
    action === "ENTRY" ? "ARMED" : "PENDING";
  const protectionTargets = buildProtectionTargets(
    snapshot.symbol,
    snapshot.priceCandles,
    orderBlock,
    trendDirection,
    latestPrice,
  );
  const rationale =
    trendDirection === "NEUTRAL"
      ? `${snapshot.symbol} is not showing the required OI-price expansion on the 1h feed, so TrendX keeps the desk flat and waits.`
      : `${snapshot.symbol} shows ${trendDirection.toLowerCase()} OI-price alignment with price ${formatSignedPct(priceChangePct)} and open interest ${formatSignedPct(oiChangePct)} over the recent 12h. ${confirmationCount}/6 live Coinank checks are aligned, and price is ${inOrderBlockRange ? "inside" : "outside"} the preferred 1h order block.`;

  return {
    action,
    confirmationCount,
    confirmationThreshold: CONFIRMATION_THRESHOLD,
    checklist: buildChecklist(confirmationMatches),
    currentPosition: {
      leverage: 20,
      pnl: 0,
      side: "FLAT",
      sizeUsd: 0,
    },
    cvdBiasPct: Number(cvdBiasPct.toFixed(2)),
    entryStages: [
      {
        allocationPct: 30,
        plannedPrice: orderBlock.high,
        zone: "upper",
      },
      {
        allocationPct: 40,
        plannedPrice: orderBlock.mid,
        zone: "mid",
      },
      {
        allocationPct: 30,
        plannedPrice: orderBlock.low,
        zone: "lower",
      },
    ],
    executionStatus,
    fundingRate: Number(fundingRatePct.toFixed(4)),
    lastPrice: roundPrice(snapshot.symbol, latestPrice),
    markPrice: roundPrice(snapshot.symbol, latestPrice),
    openInterestDeltaPct: Number(oiChangePct.toFixed(2)),
    orderBlock,
    rationale,
    riskLabel,
    stopLoss: protectionTargets.stopLoss,
    symbol: snapshot.symbol,
    takeProfitOne: protectionTargets.takeProfitOne,
    takeProfitTwo: protectionTargets.takeProfitTwo,
    trendDirection,
  };
}

function buildReferenceAccountRisk() {
  return {
    availableMargin: DEFAULT_REFERENCE_EQUITY,
    dailyPnl: 0,
    equity: DEFAULT_REFERENCE_EQUITY,
    exposurePct: 0,
    openPositionCount: 0,
    usedMargin: 0,
  };
}

export async function buildDashboardOverview(): Promise<GetDashboardOverviewOutput> {
  const config = getCoinankDashboardConfig();

  if (!config) {
    logger.warn("Coinank API key missing; serving seeded dashboard overview.");
    return buildSeededDashboardOverview(
      "Coinank API key missing. Serving seeded dashboard overview.",
    );
  }

  const liveResults = await Promise.allSettled(
    config.trackedPairs.map(async (symbol) => {
      const snapshot = await fetchCoinankPairSnapshot(config, symbol);
      return buildLiveDashboardPair(config, snapshot);
    }),
  );

  const reasons = [
    "Coinank live market data loaded for dashboard pairs.",
    "Account risk remains reference-only until Binance execution is integrated.",
  ];

  const pairs = liveResults.map((result, index) => {
    const fallbackSymbol = config.trackedPairs[index];

    if (!fallbackSymbol) {
      return buildSeededDashboardPair("BTCUSDT");
    }

    if (result.status === "fulfilled") {
      return result.value;
    }

    logger.warn("Falling back to seeded pair after Coinank fetch failure", {
      error:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
      symbol: fallbackSymbol,
    });
    reasons.push(
      `${fallbackSymbol} is using seeded fallback data after a Coinank fetch failure.`,
    );

    return buildSeededDashboardPair(fallbackSymbol);
  });

  return getDashboardOverviewOutputSchema.parse({
    overview: {
      accountRisk: buildReferenceAccountRisk(),
      cadenceMinutes: 60,
      generatedAt: new Date().toISOString(),
      killSwitchEnabled: config.killSwitchEnabled,
      operatorMode: "AUTOMATED",
      pairs,
    },
    reason: reasons.join(" "),
    success: true,
  });
}
