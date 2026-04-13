import { DASHBOARD_EXECUTION_CONFIG } from "../config";
import type { DashboardPair } from "../types";
import type {
  DashboardMarketDataCandle,
  DashboardMarketDataLiquidationPoint,
  DashboardMarketDataSnapshot,
} from "./market-data-provider";

const OI_CONFIRMATION_THRESHOLD_PCT = 0.5;
const PRICE_CONFIRMATION_THRESHOLD_PCT = 0.35;
const SWING_STRENGTH = 2;
const ORDER_BLOCK_SEARCH_WINDOW = 36;
const ORDER_BLOCK_SOURCE_LOOKBACK = 8;
const SWING_TO_BREAK_MAX_DISTANCE = 14;
const DISPLACEMENT_LOOKBACK = 5;
const DISPLACEMENT_BODY_MULTIPLIER = 1.2;
const DISPLACEMENT_RANGE_MULTIPLIER = 1.1;
const DISPLACEMENT_CLOSE_LOCATION_THRESHOLD = 0.65;
const STRUCTURE_BREAK_BUFFER_PCT = 0.08;
const RECENT_BASE_ORDER_BLOCK_SEARCH_WINDOW = 18;
const ORDER_BLOCK_REFINEMENT_INTERVAL = "15m";
const ORDER_BLOCK_REFINEMENT_LOOKAHEAD = 8;
const ORDER_BLOCK_REFINEMENT_CONTEXT = 4;
const DEFAULT_INTERVAL_DURATION_MS = 60 * 60 * 1000;
const CONFIRMATION_THRESHOLD = DASHBOARD_EXECUTION_CONFIG.confirmationThreshold;
const EXECUTION_LEVERAGE = DASHBOARD_EXECUTION_CONFIG.leverage;
const ENTRY_STAGE_BLUEPRINTS = [
  {
    allocationPct: DASHBOARD_EXECUTION_CONFIG.stageAllocations[0],
    plannedPriceKey: "high",
    zone: "upper",
  },
  {
    allocationPct: DASHBOARD_EXECUTION_CONFIG.stageAllocations[1],
    plannedPriceKey: "mid",
    zone: "mid",
  },
  {
    allocationPct: DASHBOARD_EXECUTION_CONFIG.stageAllocations[2],
    plannedPriceKey: "low",
    zone: "lower",
  },
] as const satisfies ReadonlyArray<{
  allocationPct: number;
  plannedPriceKey: keyof DashboardPair["orderBlock"];
  zone: DashboardPair["entryStages"][number]["zone"];
}>;

type OrderBlockDirection = Exclude<DashboardPair["trendDirection"], "NEUTRAL">;

interface OrderBlockCandidate {
  breakBegin: number;
  breakIndex: number;
  direction: OrderBlockDirection;
  isFresh: boolean;
  orderBlock: DashboardPair["orderBlock"];
  refinementInterval: string | null;
  source: "fallback" | "recentBase" | "structure";
  sourceBegin: number;
  sourceIndex: number;
  structureLevel: number | null;
}

interface SwingPoint {
  index: number;
  price: number;
}

interface PreviousOppositeOrderBlockResult {
  direction: OrderBlockDirection;
  orderBlock: DashboardPair["orderBlock"];
}

interface EntryPlanResult {
  entryStages: DashboardPair["entryStages"];
  triggeredStageCount: number;
}

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

function getAverage(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getCandleRange(candle: DashboardMarketDataCandle): number {
  return Math.max(candle.high - candle.low, 0);
}

function getCandleBodySize(candle: DashboardMarketDataCandle): number {
  return Math.abs(candle.close - candle.open);
}

function getCandleBodyHigh(candle: DashboardMarketDataCandle): number {
  return Math.max(candle.open, candle.close);
}

function getCandleBodyLow(candle: DashboardMarketDataCandle): number {
  return Math.min(candle.open, candle.close);
}

function getLatestCandle(
  candles: DashboardMarketDataCandle[],
): DashboardMarketDataCandle | null {
  return candles[candles.length - 1] ?? null;
}

function getAnchorCandle(
  candles: DashboardMarketDataCandle[],
  offset: number,
): DashboardMarketDataCandle | null {
  const anchorIndex = Math.max(candles.length - 1 - offset, 0);

  return candles[anchorIndex] ?? null;
}

function getCompletedCandles(
  candles: DashboardMarketDataCandle[],
): DashboardMarketDataCandle[] {
  if (candles.length <= 1) {
    return candles;
  }

  return candles.slice(0, -1);
}

function getRecentCandles(
  candles: DashboardMarketDataCandle[],
  count: number,
): DashboardMarketDataCandle[] {
  return candles.slice(Math.max(candles.length - count, 0));
}

function getHighestHigh(
  candles: DashboardMarketDataCandle[],
  fallback: number,
): number {
  if (!candles.length) {
    return fallback;
  }

  return Math.max(...candles.map((candle) => candle.high));
}

function getLowestLow(
  candles: DashboardMarketDataCandle[],
  fallback: number,
): number {
  if (!candles.length) {
    return fallback;
  }

  return Math.min(...candles.map((candle) => candle.low));
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

function getIntervalDurationMs(interval: string): number {
  const normalized = interval.trim().toLowerCase();
  const match = normalized.match(/^(\d+)(m|h|d)$/);

  if (!match) {
    return DEFAULT_INTERVAL_DURATION_MS;
  }

  const [, rawValue, rawUnit] = match;
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_INTERVAL_DURATION_MS;
  }

  if (rawUnit === "m") {
    return value * 60 * 1000;
  }

  if (rawUnit === "h") {
    return value * 60 * 60 * 1000;
  }

  return value * 24 * 60 * 60 * 1000;
}

function isSwingHigh(
  candles: DashboardMarketDataCandle[],
  index: number,
): boolean {
  const center = candles[index];

  if (!center) {
    return false;
  }

  for (let offset = 1; offset <= SWING_STRENGTH; offset += 1) {
    const left = candles[index - offset];
    const right = candles[index + offset];

    if (!left || !right) {
      return false;
    }

    if (center.high <= left.high || center.high < right.high) {
      return false;
    }
  }

  return true;
}

function isSwingLow(
  candles: DashboardMarketDataCandle[],
  index: number,
): boolean {
  const center = candles[index];

  if (!center) {
    return false;
  }

  for (let offset = 1; offset <= SWING_STRENGTH; offset += 1) {
    const left = candles[index - offset];
    const right = candles[index + offset];

    if (!left || !right) {
      return false;
    }

    if (center.low >= left.low || center.low > right.low) {
      return false;
    }
  }

  return true;
}

function findPreviousSwingPoint(
  candles: DashboardMarketDataCandle[],
  fromIndex: number,
  type: "high" | "low",
): SwingPoint | null {
  const upperBound = Math.min(fromIndex, candles.length - 1 - SWING_STRENGTH);

  for (let index = upperBound; index >= SWING_STRENGTH; index -= 1) {
    const candle = candles[index];

    if (!candle) {
      continue;
    }

    if (type === "high" && isSwingHigh(candles, index)) {
      return {
        index,
        price: candle.high,
      };
    }

    if (type === "low" && isSwingLow(candles, index)) {
      return {
        index,
        price: candle.low,
      };
    }
  }

  return null;
}

function breaksStructure(
  candle: DashboardMarketDataCandle,
  structureLevel: number,
  trendDirection: DashboardPair["trendDirection"],
): boolean {
  const buffer = structureLevel * (STRUCTURE_BREAK_BUFFER_PCT / 100);

  if (trendDirection === "BULLISH") {
    return candle.close > structureLevel + buffer;
  }

  if (trendDirection === "BEARISH") {
    return candle.close < structureLevel - buffer;
  }

  return false;
}

function hasDisplacement(
  candles: DashboardMarketDataCandle[],
  index: number,
  trendDirection: DashboardPair["trendDirection"],
): boolean {
  const candle = candles[index];

  if (!candle) {
    return false;
  }

  const context = candles.slice(
    Math.max(index - DISPLACEMENT_LOOKBACK, 0),
    index,
  );

  if (!context.length) {
    return false;
  }

  const averageBody = getAverage(context.map(getCandleBodySize));
  const averageRange = getAverage(context.map(getCandleRange));
  const body = getCandleBodySize(candle);
  const range = getCandleRange(candle);
  const closeLocation = range === 0 ? 0.5 : (candle.close - candle.low) / range;

  if (trendDirection === "BULLISH") {
    return (
      candle.close > candle.open &&
      body >= averageBody * DISPLACEMENT_BODY_MULTIPLIER &&
      range >= averageRange * DISPLACEMENT_RANGE_MULTIPLIER &&
      closeLocation >= DISPLACEMENT_CLOSE_LOCATION_THRESHOLD
    );
  }

  if (trendDirection === "BEARISH") {
    return (
      candle.close < candle.open &&
      body >= averageBody * DISPLACEMENT_BODY_MULTIPLIER &&
      range >= averageRange * DISPLACEMENT_RANGE_MULTIPLIER &&
      closeLocation <= 1 - DISPLACEMENT_CLOSE_LOCATION_THRESHOLD
    );
  }

  return false;
}

function buildOrderBlockFromCandle(
  symbol: DashboardPair["symbol"],
  candle: DashboardMarketDataCandle,
  trendDirection: OrderBlockDirection,
): DashboardPair["orderBlock"] {
  const bodyHigh = getCandleBodyHigh(candle);
  const bodyLow = getCandleBodyLow(candle);
  const high =
    trendDirection === "BEARISH" ? candle.high : Math.max(bodyHigh, bodyLow);
  const low =
    trendDirection === "BULLISH" ? candle.low : Math.min(bodyHigh, bodyLow);
  const normalizedHigh = Math.max(high, low);
  const normalizedLow = Math.min(high, low);

  return {
    high: roundPrice(symbol, normalizedHigh),
    low: roundPrice(symbol, normalizedLow),
    mid: roundPrice(symbol, (normalizedHigh + normalizedLow) / 2),
  };
}

function buildOrderBlockFromBaseCandles(
  symbol: DashboardPair["symbol"],
  candles: DashboardMarketDataCandle[],
  trendDirection: OrderBlockDirection,
): DashboardPair["orderBlock"] {
  if (!candles.length) {
    return buildOrderBlockFromCandle(
      symbol,
      {
        begin: 0,
        close: 0,
        high: 0,
        low: 0,
        open: 0,
      },
      trendDirection,
    );
  }

  const high =
    trendDirection === "BULLISH"
      ? Math.max(...candles.map(getCandleBodyHigh))
      : Math.max(...candles.map((candle) => candle.high));
  const low =
    trendDirection === "BULLISH"
      ? Math.min(...candles.map((candle) => candle.low))
      : Math.min(...candles.map(getCandleBodyLow));

  return {
    high: roundPrice(symbol, high),
    low: roundPrice(symbol, low),
    mid: roundPrice(symbol, (high + low) / 2),
  };
}

function buildFullRangeOrderBlockFromCandle(
  symbol: DashboardPair["symbol"],
  candle: DashboardMarketDataCandle,
): DashboardPair["orderBlock"] {
  return {
    high: roundPrice(symbol, candle.high),
    low: roundPrice(symbol, candle.low),
    mid: roundPrice(symbol, (candle.high + candle.low) / 2),
  };
}

function isDirectionalCandle(
  candle: DashboardMarketDataCandle,
  trendDirection: OrderBlockDirection,
): boolean {
  if (trendDirection === "BULLISH") {
    return candle.close > candle.open;
  }

  return candle.close < candle.open;
}

function isBaseOrderBlockCandle(
  candle: DashboardMarketDataCandle,
  trendDirection: OrderBlockDirection,
): boolean {
  if (trendDirection === "BULLISH") {
    return candle.close <= candle.open;
  }

  return candle.close >= candle.open;
}

function buildSingleCandleFallbackOrderBlockCandidate(
  symbol: DashboardPair["symbol"],
  candles: DashboardMarketDataCandle[],
  trendDirection: OrderBlockDirection,
): OrderBlockCandidate {
  const completedCandles = getCompletedCandles(candles);
  const searchWindow = getRecentCandles(completedCandles, 12).slice().reverse();
  const selectedCandle = searchWindow.find((candle) =>
    isBaseOrderBlockCandle(candle, trendDirection),
  );
  const fallbackCandle =
    selectedCandle ??
    getLatestCandle(completedCandles) ??
    getLatestCandle(candles);

  if (!fallbackCandle) {
    return {
      breakBegin: 0,
      breakIndex: 0,
      direction: trendDirection,
      isFresh: false,
      orderBlock: buildOrderBlockFromCandle(
        symbol,
        {
          begin: 0,
          close: 0,
          high: 0,
          low: 0,
          open: 0,
        },
        trendDirection,
      ),
      refinementInterval: null,
      source: "fallback",
      sourceBegin: 0,
      sourceIndex: 0,
      structureLevel: null,
    };
  }

  const sourceIndex = completedCandles.indexOf(fallbackCandle);

  return {
    breakBegin: fallbackCandle.begin,
    breakIndex: Math.max(sourceIndex, 0),
    direction: trendDirection,
    isFresh: false,
    orderBlock: buildOrderBlockFromCandle(
      symbol,
      fallbackCandle,
      trendDirection,
    ),
    refinementInterval: null,
    source: "fallback",
    sourceBegin: fallbackCandle.begin,
    sourceIndex: Math.max(sourceIndex, 0),
    structureLevel: null,
  };
}

function buildRecentBaseOrderBlockCandidate(
  symbol: DashboardPair["symbol"],
  candles: DashboardMarketDataCandle[],
  trendDirection: OrderBlockDirection,
): OrderBlockCandidate | null {
  const completedCandles = getCompletedCandles(candles);
  const searchWindowStart = Math.max(
    completedCandles.length - RECENT_BASE_ORDER_BLOCK_SEARCH_WINDOW,
    1,
  );

  for (
    let index = completedCandles.length - 1;
    index >= searchWindowStart;
    index -= 1
  ) {
    const reactionCandle = completedCandles[index];
    const previousCandle = completedCandles[index - 1];

    if (
      !reactionCandle ||
      !previousCandle ||
      !hasDisplacement(completedCandles, index, trendDirection) ||
      !isDirectionalCandle(reactionCandle, trendDirection) ||
      !isBaseOrderBlockCandle(previousCandle, trendDirection)
    ) {
      continue;
    }

    const baseCandles: DashboardMarketDataCandle[] = [previousCandle];
    let baseStartIndex = index - 1;

    for (
      let baseIndex = index - 2;
      baseIndex >= searchWindowStart - 1;
      baseIndex -= 1
    ) {
      const candle = completedCandles[baseIndex];

      if (!candle || !isBaseOrderBlockCandle(candle, trendDirection)) {
        break;
      }

      baseCandles.unshift(candle);
      baseStartIndex = baseIndex;
    }

    const orderBlock = buildOrderBlockFromBaseCandles(
      symbol,
      baseCandles,
      trendDirection,
    );

    return {
      breakBegin: reactionCandle.begin,
      breakIndex: index,
      direction: trendDirection,
      isFresh: !wasOrderBlockRetested(completedCandles, index, orderBlock),
      orderBlock,
      refinementInterval: null,
      source: "recentBase",
      sourceBegin:
        completedCandles[baseStartIndex]?.begin ?? previousCandle.begin,
      sourceIndex: baseStartIndex,
      structureLevel: null,
    };
  }

  return null;
}

function findOrderBlockSourceIndex(
  candles: DashboardMarketDataCandle[],
  breakIndex: number,
  trendDirection: DashboardPair["trendDirection"],
  minimumIndex: number,
): number | null {
  const lowerBound = Math.max(
    minimumIndex,
    breakIndex - ORDER_BLOCK_SOURCE_LOOKBACK,
  );

  for (let index = breakIndex - 1; index >= lowerBound; index -= 1) {
    const candle = candles[index];

    if (!candle) {
      continue;
    }

    if (trendDirection === "BULLISH" && candle.close < candle.open) {
      return index;
    }

    if (trendDirection === "BEARISH" && candle.close > candle.open) {
      return index;
    }
  }

  return null;
}

function wasOrderBlockRetested(
  candles: DashboardMarketDataCandle[],
  breakIndex: number,
  orderBlock: DashboardPair["orderBlock"],
): boolean {
  for (let index = breakIndex + 1; index < candles.length; index += 1) {
    const candle = candles[index];

    if (!candle) {
      continue;
    }

    if (candle.low <= orderBlock.high && candle.high >= orderBlock.low) {
      return true;
    }
  }

  return false;
}

function selectStructuredOrderBlock(
  symbol: DashboardPair["symbol"],
  candles: DashboardMarketDataCandle[],
  trendDirection: OrderBlockDirection,
): OrderBlockCandidate | null {
  const completedCandles = getCompletedCandles(candles);

  if (
    completedCandles.length <
    SWING_STRENGTH * 2 + DISPLACEMENT_LOOKBACK + 2
  ) {
    return null;
  }

  const earliestBreakIndex = Math.max(
    SWING_STRENGTH + DISPLACEMENT_LOOKBACK,
    completedCandles.length - ORDER_BLOCK_SEARCH_WINDOW,
  );
  const latestBreakIndex = completedCandles.length - 1 - SWING_STRENGTH;

  for (let index = latestBreakIndex; index >= earliestBreakIndex; index -= 1) {
    const breakCandle = completedCandles[index];

    if (!breakCandle) {
      continue;
    }

    const swingPoint = findPreviousSwingPoint(
      completedCandles,
      index - 1,
      trendDirection === "BULLISH" ? "high" : "low",
    );

    if (!swingPoint || index - swingPoint.index > SWING_TO_BREAK_MAX_DISTANCE) {
      continue;
    }

    if (
      !breaksStructure(breakCandle, swingPoint.price, trendDirection) ||
      !hasDisplacement(completedCandles, index, trendDirection)
    ) {
      continue;
    }

    const sourceIndex = findOrderBlockSourceIndex(
      completedCandles,
      index,
      trendDirection,
      swingPoint.index,
    );

    if (sourceIndex === null) {
      continue;
    }

    const sourceCandle = completedCandles[sourceIndex];

    if (!sourceCandle) {
      continue;
    }

    const orderBlock = buildOrderBlockFromCandle(
      symbol,
      sourceCandle,
      trendDirection,
    );

    return {
      breakBegin: breakCandle.begin,
      breakIndex: index,
      direction: trendDirection,
      isFresh: !wasOrderBlockRetested(completedCandles, index, orderBlock),
      orderBlock,
      refinementInterval: null,
      source: "structure",
      sourceBegin: sourceCandle.begin,
      sourceIndex,
      structureLevel: swingPoint.price,
    };
  }

  return null;
}

function getOrderBlockDistanceFromPrice(
  orderBlock: DashboardPair["orderBlock"],
  latestPrice: number,
): number {
  if (latestPrice < orderBlock.low) {
    return orderBlock.low - latestPrice;
  }

  if (latestPrice > orderBlock.high) {
    return latestPrice - orderBlock.high;
  }

  return 0;
}

function choosePreferredOrderBlockCandidate(
  candidates: OrderBlockCandidate[],
  latestPrice: number,
): OrderBlockCandidate | null {
  let selectedCandidate: OrderBlockCandidate | null = null;

  for (const candidate of candidates) {
    if (!selectedCandidate) {
      selectedCandidate = candidate;
      continue;
    }

    const candidateDistance = getOrderBlockDistanceFromPrice(
      candidate.orderBlock,
      latestPrice,
    );
    const selectedDistance = getOrderBlockDistanceFromPrice(
      selectedCandidate.orderBlock,
      latestPrice,
    );

    if (candidateDistance < selectedDistance) {
      selectedCandidate = candidate;
      continue;
    }

    if (
      candidateDistance === selectedDistance &&
      candidate.source === "structure" &&
      selectedCandidate.source !== "structure"
    ) {
      selectedCandidate = candidate;
      continue;
    }

    if (
      candidateDistance === selectedDistance &&
      candidate.sourceBegin > selectedCandidate.sourceBegin
    ) {
      selectedCandidate = candidate;
    }
  }

  return selectedCandidate;
}

function chooseMostRecentOrderBlockCandidate(
  candidates: OrderBlockCandidate[],
): OrderBlockCandidate | null {
  let selectedCandidate: OrderBlockCandidate | null = null;

  for (const candidate of candidates) {
    if (
      !selectedCandidate ||
      candidate.sourceBegin > selectedCandidate.sourceBegin
    ) {
      selectedCandidate = candidate;
      continue;
    }

    if (
      candidate.sourceBegin === selectedCandidate.sourceBegin &&
      candidate.source === "structure" &&
      selectedCandidate.source !== "structure"
    ) {
      selectedCandidate = candidate;
    }
  }

  return selectedCandidate;
}

function selectDirectionalOrderBlockCandidate(
  symbol: DashboardPair["symbol"],
  candles: DashboardMarketDataCandle[],
  trendDirection: OrderBlockDirection,
  latestPrice: number,
): OrderBlockCandidate {
  const structuredCandidate = selectStructuredOrderBlock(
    symbol,
    candles,
    trendDirection,
  );
  const recentBaseCandidate = buildRecentBaseOrderBlockCandidate(
    symbol,
    candles,
    trendDirection,
  );
  const preferredCandidate = choosePreferredOrderBlockCandidate(
    [structuredCandidate, recentBaseCandidate].filter(
      (candidate): candidate is OrderBlockCandidate => candidate !== null,
    ),
    latestPrice,
  );

  return (
    preferredCandidate ??
    buildSingleCandleFallbackOrderBlockCandidate(
      symbol,
      candles,
      trendDirection,
    )
  );
}

function selectOrderBlockCandidate(
  symbol: DashboardPair["symbol"],
  candles: DashboardMarketDataCandle[],
  trendDirection: DashboardPair["trendDirection"],
  latestPrice: number,
): OrderBlockCandidate {
  if (trendDirection === "NEUTRAL") {
    const neutralCandidates = [
      selectStructuredOrderBlock(symbol, candles, "BULLISH"),
      buildRecentBaseOrderBlockCandidate(symbol, candles, "BULLISH"),
      selectStructuredOrderBlock(symbol, candles, "BEARISH"),
      buildRecentBaseOrderBlockCandidate(symbol, candles, "BEARISH"),
    ].filter(
      (candidate): candidate is OrderBlockCandidate => candidate !== null,
    );
    const neutralCandidate =
      chooseMostRecentOrderBlockCandidate(neutralCandidates);

    if (neutralCandidate) {
      return neutralCandidate;
    }

    return buildSingleCandleFallbackOrderBlockCandidate(
      symbol,
      candles,
      "BULLISH",
    );
  }

  return selectDirectionalOrderBlockCandidate(
    symbol,
    candles,
    trendDirection,
    latestPrice,
  );
}

function getOppositeOrderBlockDirection(
  direction: OrderBlockDirection,
): OrderBlockDirection {
  return direction === "BULLISH" ? "BEARISH" : "BULLISH";
}

function selectPreviousOppositeOrderBlock(
  symbol: DashboardPair["symbol"],
  candles: DashboardMarketDataCandle[],
  mainOrderBlockCandidate: OrderBlockCandidate,
): PreviousOppositeOrderBlockResult | null {
  const completedCandles = getCompletedCandles(candles);
  const oppositeDirection = getOppositeOrderBlockDirection(
    mainOrderBlockCandidate.direction,
  );
  const latestSearchIndex = Math.min(
    mainOrderBlockCandidate.sourceIndex - 1,
    completedCandles.length - 1,
  );

  for (let index = latestSearchIndex; index >= 0; index -= 1) {
    const candle = completedCandles[index];

    if (
      !candle ||
      !hasDisplacement(completedCandles, index, oppositeDirection)
    ) {
      continue;
    }

    return {
      direction: oppositeDirection,
      orderBlock: buildFullRangeOrderBlockFromCandle(symbol, candle),
    };
  }

  return null;
}

function overlapsOrderBlock(
  orderBlock: DashboardPair["orderBlock"],
  candle: DashboardMarketDataCandle,
): boolean {
  return candle.low <= orderBlock.high && candle.high >= orderBlock.low;
}

function isOppositeOrderBlockCandle(
  candle: DashboardMarketDataCandle,
  trendDirection: DashboardPair["trendDirection"],
): boolean {
  if (trendDirection === "BULLISH") {
    return candle.close < candle.open;
  }

  if (trendDirection === "BEARISH") {
    return candle.close > candle.open;
  }

  return false;
}

function intersectOrderBlocks(
  symbol: DashboardPair["symbol"],
  baseOrderBlock: DashboardPair["orderBlock"],
  refinedOrderBlock: DashboardPair["orderBlock"],
): DashboardPair["orderBlock"] | null {
  const high = Math.min(baseOrderBlock.high, refinedOrderBlock.high);
  const low = Math.max(baseOrderBlock.low, refinedOrderBlock.low);

  if (high <= low) {
    return null;
  }

  return {
    high: roundPrice(symbol, high),
    low: roundPrice(symbol, low),
    mid: roundPrice(symbol, (high + low) / 2),
  };
}

function findLowerTimeframeBreakIndex(
  candles: DashboardMarketDataCandle[],
  sourceIndex: number,
  trendDirection: DashboardPair["trendDirection"],
  windowEnd: number,
): number | null {
  const context = candles.slice(
    Math.max(sourceIndex - ORDER_BLOCK_REFINEMENT_CONTEXT, 0),
    sourceIndex,
  );

  if (!context.length) {
    return null;
  }

  const structureLevel =
    trendDirection === "BULLISH"
      ? getHighestHigh(context, candles[sourceIndex]?.high ?? 0)
      : getLowestLow(context, candles[sourceIndex]?.low ?? 0);

  for (
    let index = sourceIndex + 1;
    index <
    Math.min(
      candles.length,
      sourceIndex + 1 + ORDER_BLOCK_REFINEMENT_LOOKAHEAD,
    );
    index += 1
  ) {
    const candle = candles[index];

    if (!candle || candle.begin >= windowEnd) {
      continue;
    }

    if (
      breaksStructure(candle, structureLevel, trendDirection) &&
      hasDisplacement(candles, index, trendDirection)
    ) {
      return index;
    }
  }

  return null;
}

function refineOrderBlockCandidate(
  symbol: DashboardPair["symbol"],
  lowerTimeframeCandles: DashboardMarketDataCandle[],
  trendDirection: OrderBlockDirection,
  candidate: OrderBlockCandidate,
  higherIntervalDurationMs: number,
): OrderBlockCandidate {
  if (candidate.source !== "structure") {
    return candidate;
  }

  const completedCandles = getCompletedCandles(lowerTimeframeCandles);

  if (!completedCandles.length) {
    return candidate;
  }

  const refinementWindowEnd = candidate.breakBegin + higherIntervalDurationMs;

  for (let index = completedCandles.length - 1; index >= 0; index -= 1) {
    const candle = completedCandles[index];

    if (!candle) {
      continue;
    }

    if (
      candle.begin < candidate.sourceBegin ||
      candle.begin >= refinementWindowEnd ||
      !isOppositeOrderBlockCandle(candle, trendDirection) ||
      !overlapsOrderBlock(candidate.orderBlock, candle)
    ) {
      continue;
    }

    const breakIndex = findLowerTimeframeBreakIndex(
      completedCandles,
      index,
      trendDirection,
      refinementWindowEnd,
    );

    if (breakIndex === null) {
      continue;
    }

    const refinedOrderBlock = buildOrderBlockFromCandle(
      symbol,
      candle,
      trendDirection,
    );
    const intersectedOrderBlock = intersectOrderBlocks(
      symbol,
      candidate.orderBlock,
      refinedOrderBlock,
    );

    if (!intersectedOrderBlock) {
      continue;
    }

    return {
      ...candidate,
      breakBegin: completedCandles[breakIndex]?.begin ?? candidate.breakBegin,
      breakIndex,
      isFresh:
        candidate.isFresh &&
        !wasOrderBlockRetested(
          completedCandles,
          breakIndex,
          intersectedOrderBlock,
        ),
      orderBlock: intersectedOrderBlock,
      refinementInterval: ORDER_BLOCK_REFINEMENT_INTERVAL,
      sourceBegin: candle.begin,
      sourceIndex: index,
    };
  }

  return candidate;
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
  liquidations: DashboardMarketDataLiquidationPoint[],
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

function getOrderBlockTolerance(
  orderBlock: DashboardPair["orderBlock"],
  latestPrice: number,
): number {
  const orderBlockHeight = Math.max(orderBlock.high - orderBlock.low, 0);

  return Math.max(orderBlockHeight * 0.12, latestPrice * 0.0005);
}

function isInOrderBlockRange(
  orderBlock: DashboardPair["orderBlock"],
  latestPrice: number,
): boolean {
  const tolerance = getOrderBlockTolerance(orderBlock, latestPrice);

  return (
    latestPrice >= orderBlock.low - tolerance &&
    latestPrice <= orderBlock.high + tolerance
  );
}

function getEntryStageTolerance(
  orderBlock: DashboardPair["orderBlock"],
  latestPrice: number,
): number {
  const orderBlockHeight = Math.max(orderBlock.high - orderBlock.low, 0);

  return Math.max(orderBlockHeight * 0.03, latestPrice * 0.0003);
}

function getStageTraversalOrder(
  trendDirection: DashboardPair["trendDirection"],
): DashboardPair["entryStages"][number]["zone"][] {
  if (trendDirection === "BEARISH") {
    return ["lower", "mid", "upper"];
  }

  return ["upper", "mid", "lower"];
}

function hasStageBeenReached(
  plannedPrice: number,
  latestPrice: number,
  tolerance: number,
  trendDirection: DashboardPair["trendDirection"],
): boolean {
  if (trendDirection === "BEARISH") {
    return latestPrice >= plannedPrice - tolerance;
  }

  return latestPrice <= plannedPrice + tolerance;
}

function getDirectionalSwingLevels(
  candles: DashboardMarketDataCandle[],
  latestPrice: number,
  trendDirection: DashboardPair["trendDirection"],
): number[] {
  const levels: number[] = [];

  for (
    let index = SWING_STRENGTH;
    index < candles.length - SWING_STRENGTH;
    index += 1
  ) {
    const candle = candles[index];

    if (!candle) {
      continue;
    }

    if (
      trendDirection === "BULLISH" &&
      isSwingHigh(candles, index) &&
      candle.high > latestPrice
    ) {
      levels.push(candle.high);
    }

    if (
      trendDirection === "BEARISH" &&
      isSwingLow(candles, index) &&
      candle.low < latestPrice
    ) {
      levels.push(candle.low);
    }
  }

  const uniqueLevels = Array.from(
    new Set(levels.map((level) => Number(level.toFixed(8)))),
  );

  if (trendDirection === "BEARISH") {
    return uniqueLevels.sort((left, right) => right - left);
  }

  return uniqueLevels.sort((left, right) => left - right);
}

function buildProtectionTargets(
  symbol: DashboardPair["symbol"],
  candles: DashboardMarketDataCandle[],
  orderBlock: DashboardPair["orderBlock"],
  trendDirection: DashboardPair["trendDirection"],
  latestPrice: number,
): Pick<DashboardPair, "stopLoss" | "takeProfitOne" | "takeProfitTwo"> {
  const completedCandles = getCompletedCandles(candles);
  const structureCandles = completedCandles.length ? completedCandles : candles;
  const shortWindow = getRecentCandles(structureCandles, 12);
  const longWindow = getRecentCandles(structureCandles, 24);
  const highestRecentPrice = getHighestHigh(shortWindow, latestPrice);
  const lowestRecentPrice = getLowestLow(shortWindow, latestPrice);
  const highestExtendedPrice = getHighestHigh(longWindow, highestRecentPrice);
  const lowestExtendedPrice = getLowestLow(longWindow, lowestRecentPrice);
  const structuralTargets = getDirectionalSwingLevels(
    longWindow,
    latestPrice,
    trendDirection,
  );
  const averageRange = getAverage(shortWindow.map(getCandleRange));
  const orderBlockHeight = Math.max(
    orderBlock.high - orderBlock.low,
    averageRange * 0.35,
    latestPrice * 0.0008,
  );
  const stopBuffer = Math.max(
    orderBlockHeight * 0.12,
    averageRange * 0.18,
    latestPrice * 0.0005,
  );

  if (trendDirection === "BEARISH") {
    const stopLoss = roundPrice(symbol, orderBlock.high + stopBuffer);
    const takeProfitOneRaw =
      structuralTargets[0] ??
      Math.min(lowestRecentPrice, latestPrice - orderBlockHeight * 1.6);
    const takeProfitTwoRaw =
      structuralTargets[1] ??
      Math.min(lowestExtendedPrice, takeProfitOneRaw - orderBlockHeight);

    return {
      stopLoss,
      takeProfitOne: roundPrice(symbol, takeProfitOneRaw),
      takeProfitTwo: roundPrice(
        symbol,
        Math.min(takeProfitTwoRaw, takeProfitOneRaw - orderBlockHeight * 0.8),
      ),
    };
  }

  const stopLoss = roundPrice(symbol, orderBlock.low - stopBuffer);
  const takeProfitOneRaw =
    structuralTargets[0] ??
    Math.max(highestRecentPrice, latestPrice + orderBlockHeight * 1.6);
  const takeProfitTwoRaw =
    structuralTargets[1] ??
    Math.max(highestExtendedPrice, takeProfitOneRaw + orderBlockHeight);

  return {
    stopLoss,
    takeProfitOne: roundPrice(symbol, takeProfitOneRaw),
    takeProfitTwo: roundPrice(
      symbol,
      Math.max(takeProfitTwoRaw, takeProfitOneRaw + orderBlockHeight * 0.8),
    ),
  };
}

function buildEntryPlan(
  orderBlock: DashboardPair["orderBlock"],
  trendDirection: DashboardPair["trendDirection"],
  latestPrice: number,
  entryConditionsMet: boolean,
): EntryPlanResult {
  const entryStages: DashboardPair["entryStages"] = ENTRY_STAGE_BLUEPRINTS.map(
    ({ allocationPct, plannedPriceKey, zone }) => ({
      allocationPct,
      plannedPrice: orderBlock[plannedPriceKey],
      status: "WAITING",
      zone,
    }),
  );

  const stageOrder = getStageTraversalOrder(trendDirection);
  const stageTolerance = getEntryStageTolerance(orderBlock, latestPrice);
  const stageLookup = new Map(
    entryStages.map((stage) => [stage.zone, stage] as const),
  );
  let priceReachedStageCount = 0;

  for (const zone of stageOrder) {
    const stage = stageLookup.get(zone);

    if (
      stage &&
      hasStageBeenReached(
        stage.plannedPrice,
        latestPrice,
        stageTolerance,
        trendDirection,
      )
    ) {
      priceReachedStageCount += 1;
      continue;
    }

    break;
  }

  const triggeredStageCount = entryConditionsMet ? priceReachedStageCount : 0;

  if (!entryConditionsMet) {
    return {
      entryStages: entryStages.map((stage) => ({
        ...stage,
        status: "LOCKED",
      })),
      triggeredStageCount,
    };
  }

  const nextZone = stageOrder[triggeredStageCount];

  return {
    entryStages: entryStages.map((stage) => ({
      ...stage,
      status:
        stageOrder.indexOf(stage.zone) < triggeredStageCount
          ? "TRIGGERED"
          : stage.zone === nextZone
            ? "NEXT"
            : "WAITING",
    })),
    triggeredStageCount,
  };
}

function buildRiskLabel(params: {
  action: DashboardPair["action"];
  hasConfirmedStructure: boolean;
  inOrderBlockRange: boolean;
  isFresh: boolean;
  trendDirection: DashboardPair["trendDirection"];
}): string {
  if (params.trendDirection === "NEUTRAL") {
    return "No directional edge";
  }

  if (!params.hasConfirmedStructure) {
    return "Trend valid, structure not confirmed";
  }

  if (!params.isFresh) {
    return "Confirmed block already mitigated";
  }

  if (params.action === "ENTRY") {
    return params.trendDirection === "BULLISH"
      ? "Aligned long continuation"
      : "Aligned short continuation";
  }

  if (params.inOrderBlockRange) {
    return "Low conviction at confirmed zone";
  }

  return "Waiting for confirmed zone";
}

function buildRationale(params: {
  confirmationCount: number;
  hasConfirmedStructure: boolean;
  inOrderBlockRange: boolean;
  isFresh: boolean;
  oiChangePct: number;
  orderBlockCandidate: OrderBlockCandidate;
  priceChangePct: number;
  symbol: DashboardPair["symbol"];
  trendDirection: DashboardPair["trendDirection"];
}): string {
  if (params.trendDirection === "NEUTRAL") {
    return `${params.symbol} is not showing the required OI-price expansion on the 1h feed, so TrendX keeps the desk flat and waits while tracking the latest ${params.orderBlockCandidate.direction === "BULLISH" ? "bullish" : "bearish"} main order block.`;
  }

  const structureSentence = params.hasConfirmedStructure
    ? `A confirmed 1h ${params.trendDirection === "BULLISH" ? "bullish" : "bearish"} order block was anchored to the last ${params.trendDirection === "BULLISH" ? "down" : "up"} candle before a BOS close through ${params.orderBlockCandidate.structureLevel?.toFixed(2) ?? "structure"}. The block is ${params.isFresh ? "fresh" : "already mitigated"}.`
    : params.orderBlockCandidate.source === "recentBase"
      ? `TrendX is tracking the nearest 1h ${params.trendDirection === "BULLISH" ? "demand" : "supply"} base at the latest pullback, but price has not printed a structure-confirmed block yet.`
      : "No structure-confirmed 1h order block was found, so the current zone remains reference-only.";
  const refinementSentence =
    params.orderBlockCandidate.refinementInterval === null
      ? ""
      : ` The execution zone was refined on ${params.orderBlockCandidate.refinementInterval}.`;

  return `${params.symbol} shows ${params.trendDirection.toLowerCase()} OI-price alignment with price ${formatSignedPct(params.priceChangePct)} and open interest ${formatSignedPct(params.oiChangePct)} over the recent 12h. ${params.confirmationCount}/6 signal checks are aligned. ${structureSentence}${refinementSentence} Price is ${params.inOrderBlockRange ? "inside" : "outside"} the tracked zone.`;
}

export function buildLiveDashboardPair(
  snapshot: DashboardMarketDataSnapshot,
): DashboardPair {
  const latestPriceCandle = getLatestCandle(snapshot.priceCandles);
  const latestExecutionPriceCandle =
    getLatestCandle(snapshot.refinedPriceCandles) ?? latestPriceCandle;
  const latestOpenInterestCandle = getLatestCandle(
    snapshot.openInterestCandles,
  );
  const latestFundingCandle = getLatestCandle(snapshot.fundingRateCandles);
  const priceAnchor = getAnchorCandle(snapshot.priceCandles, 12);
  const openInterestAnchor = getAnchorCandle(snapshot.openInterestCandles, 12);

  if (
    !latestPriceCandle ||
    !latestExecutionPriceCandle ||
    !latestOpenInterestCandle ||
    !latestFundingCandle ||
    !priceAnchor ||
    !openInterestAnchor
  ) {
    throw new Error(
      `Market data provider did not return enough candle data for ${snapshot.symbol}.`,
    );
  }

  const latestTrendPrice = latestPriceCandle.close;
  const latestExecutionPrice = latestExecutionPriceCandle.close;
  const priceChangePct = calculatePctChange(
    latestTrendPrice,
    priceAnchor.close,
  );
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
  const cvdBiasPct = snapshot.cvdBiasPct ?? takerBiasPct;
  const higherTimeframeOrderBlockCandidate = selectOrderBlockCandidate(
    snapshot.symbol,
    snapshot.priceCandles,
    trendDirection,
    latestExecutionPrice,
  );
  const orderBlockDirection =
    trendDirection === "NEUTRAL"
      ? higherTimeframeOrderBlockCandidate.direction
      : trendDirection;
  const orderBlockCandidate = refineOrderBlockCandidate(
    snapshot.symbol,
    snapshot.refinedPriceCandles,
    orderBlockDirection,
    higherTimeframeOrderBlockCandidate,
    getIntervalDurationMs(snapshot.interval),
  );
  const mainOrderBlock = orderBlockCandidate.orderBlock;
  const previousOppositeOrderBlock = selectPreviousOppositeOrderBlock(
    snapshot.symbol,
    snapshot.priceCandles,
    orderBlockCandidate,
  );
  const hasConfirmedStructure = orderBlockCandidate.source === "structure";
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
  const entryConditionsMet =
    trendDirection !== "NEUTRAL" &&
    hasConfirmedStructure &&
    orderBlockCandidate.isFresh &&
    confirmationCount >= CONFIRMATION_THRESHOLD;
  const entryPlan = buildEntryPlan(
    mainOrderBlock,
    trendDirection,
    latestExecutionPrice,
    entryConditionsMet,
  );
  const inOrderBlockRange =
    entryPlan.triggeredStageCount > 0 &&
    isInOrderBlockRange(mainOrderBlock, latestExecutionPrice);
  const action: DashboardPair["action"] =
    trendDirection !== "NEUTRAL" &&
    entryConditionsMet &&
    entryPlan.triggeredStageCount > 0 &&
    inOrderBlockRange
      ? "ENTRY"
      : "WAIT";
  const riskLabel = buildRiskLabel({
    action,
    hasConfirmedStructure,
    inOrderBlockRange,
    isFresh: orderBlockCandidate.isFresh,
    trendDirection,
  });
  const executionStatus: DashboardPair["executionStatus"] =
    action === "ENTRY" ? "ARMED" : "PENDING";
  const protectionTargets = buildProtectionTargets(
    snapshot.symbol,
    snapshot.priceCandles,
    mainOrderBlock,
    orderBlockDirection,
    latestExecutionPrice,
  );
  const rationale = buildRationale({
    confirmationCount,
    hasConfirmedStructure,
    inOrderBlockRange,
    isFresh: orderBlockCandidate.isFresh,
    oiChangePct,
    orderBlockCandidate,
    priceChangePct,
    symbol: snapshot.symbol,
    trendDirection,
  });

  return {
    action,
    confirmationCount,
    confirmationThreshold: CONFIRMATION_THRESHOLD,
    checklist: buildChecklist(confirmationMatches),
    currentPosition: {
      leverage: EXECUTION_LEVERAGE,
      pnl: 0,
      side: "FLAT",
      sizeUsd: 0,
    },
    cvdBiasPct: Number(cvdBiasPct.toFixed(2)),
    entryStages: entryPlan.entryStages,
    executionStatus,
    fundingRate: Number(fundingRatePct.toFixed(4)),
    lastPrice: roundPrice(snapshot.symbol, latestExecutionPrice),
    mainOrderBlock,
    mainOrderBlockDirection: orderBlockDirection,
    markPrice: roundPrice(snapshot.symbol, latestExecutionPrice),
    openInterestDeltaPct: Number(oiChangePct.toFixed(2)),
    orderBlock: mainOrderBlock,
    previousOppositeOrderBlock: previousOppositeOrderBlock?.orderBlock ?? null,
    previousOppositeOrderBlockDirection:
      previousOppositeOrderBlock?.direction ?? null,
    rationale,
    riskLabel,
    stopLoss: protectionTargets.stopLoss,
    symbol: snapshot.symbol,
    takeProfitOne: protectionTargets.takeProfitOne,
    takeProfitTwo: protectionTargets.takeProfitTwo,
    trendDirection,
  };
}
