import { logger } from "@trendx/logs";
import { z } from "zod";

import type { DashboardPair } from "../../dashboard/types";

const trackedSymbols = ["BTCUSDT", "ETHUSDT"] as const;
const trackedSymbolSchema = z.enum(trackedSymbols);
const BINANCE_PUBLIC_REFINED_PRICE_INTERVAL = "15m";
const BINANCE_PUBLIC_REFINED_PRICE_LIMIT = 192;
const BINANCE_PUBLIC_REQUEST_TIMEOUT_MS = 10_000;
const BINANCE_PUBLIC_PRICE_LIMIT = 72;
const BINANCE_PUBLIC_OPEN_INTEREST_LIMIT = 24;
const BINANCE_PUBLIC_TAKER_FLOW_LIMIT = 1;
const BINANCE_PUBLIC_FUNDING_RATE_LIMIT = 24;

const binancePublicEnvSchema = z.object({
  TRENDX_BINANCE_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .default("https://fapi.binance.com"),
});

const klineRowSchema = z.array(z.union([z.coerce.number(), z.string()])).min(6);
const fundingRateRowSchema = z.object({
  fundingRate: z.string(),
  fundingTime: z.coerce.number(),
  markPrice: z.string().optional(),
  symbol: z.string().min(1),
});
const openInterestRowSchema = z.object({
  sumOpenInterest: z.string().optional(),
  sumOpenInterestValue: z.string(),
  symbol: z.string().min(1),
  timestamp: z.coerce.number(),
});
const takerFlowRowSchema = z.object({
  buySellRatio: z.string().optional(),
  buyVol: z.string(),
  sellVol: z.string(),
  timestamp: z.coerce.number(),
});

export interface BinancePublicMarketConfig {
  apiBaseUrl: string;
}

export interface BinancePublicMarketCandle {
  begin: number;
  close: number;
  high: number;
  low: number;
  open: number;
}

export interface BinancePublicAggressiveFlow {
  buyTradeTurnover: number;
  sellTradeTurnover: number;
}

export interface BinancePublicPairSnapshot {
  fundingRateCandles: BinancePublicMarketCandle[];
  liquidations: [];
  longShortRealtime: BinancePublicAggressiveFlow;
  openInterestCandles: BinancePublicMarketCandle[];
  priceCandles: BinancePublicMarketCandle[];
  refinedPriceCandles: BinancePublicMarketCandle[];
  symbol: DashboardPair["symbol"];
}

function toNumber(value: string | number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toMarketCandle(
  row: z.infer<typeof klineRowSchema>,
): BinancePublicMarketCandle {
  const rawBegin = toNumber(row[0] ?? 0);
  const rawOpen = toNumber(row[1] ?? 0);
  const rawHigh = toNumber(row[2] ?? 0);
  const rawLow = toNumber(row[3] ?? 0);
  const rawClose = toNumber(row[4] ?? 0);

  return {
    begin: rawBegin,
    close: rawClose,
    high: Math.max(rawHigh, rawLow),
    low: Math.min(rawHigh, rawLow),
    open: rawOpen,
  };
}

function toFlatCandle(params: {
  begin: number;
  value: number;
}): BinancePublicMarketCandle {
  return {
    begin: params.begin,
    close: params.value,
    high: params.value,
    low: params.value,
    open: params.value,
  };
}

function sortByBegin<T extends { begin: number }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => left.begin - right.begin);
}

async function requestBinancePublic<TData>(params: {
  apiBaseUrl: string;
  path: string;
  responseSchema: z.ZodSchema<TData>;
  searchParams: URLSearchParams;
}): Promise<TData> {
  const url = new URL(`${params.apiBaseUrl}${params.path}`);
  url.search = params.searchParams.toString();

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(BINANCE_PUBLIC_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Binance public request failed with status ${response.status} for ${params.path}.`,
    );
  }

  return params.responseSchema.parse(await response.json());
}

async function fetchBinancePublicPriceCandles(params: {
  apiBaseUrl: string;
  interval: string;
  limit: number;
  symbol: DashboardPair["symbol"];
}): Promise<BinancePublicMarketCandle[]> {
  const rows = await requestBinancePublic({
    apiBaseUrl: params.apiBaseUrl,
    path: "/fapi/v1/klines",
    responseSchema: z.array(klineRowSchema),
    searchParams: new URLSearchParams({
      interval: params.interval,
      limit: String(params.limit),
      symbol: params.symbol,
    }),
  });

  return sortByBegin(rows.map(toMarketCandle));
}

async function fetchBinancePublicFundingRateCandles(params: {
  apiBaseUrl: string;
  symbol: DashboardPair["symbol"];
}): Promise<BinancePublicMarketCandle[]> {
  const rows = await requestBinancePublic({
    apiBaseUrl: params.apiBaseUrl,
    path: "/fapi/v1/fundingRate",
    responseSchema: z.array(fundingRateRowSchema),
    searchParams: new URLSearchParams({
      limit: String(BINANCE_PUBLIC_FUNDING_RATE_LIMIT),
      symbol: params.symbol,
    }),
  });

  return sortByBegin(
    rows.map((row) =>
      toFlatCandle({
        begin: row.fundingTime,
        value: toNumber(row.fundingRate),
      }),
    ),
  );
}

async function fetchBinancePublicOpenInterestCandles(params: {
  apiBaseUrl: string;
  interval: string;
  symbol: DashboardPair["symbol"];
}): Promise<BinancePublicMarketCandle[]> {
  const rows = await requestBinancePublic({
    apiBaseUrl: params.apiBaseUrl,
    path: "/futures/data/openInterestHist",
    responseSchema: z.array(openInterestRowSchema),
    searchParams: new URLSearchParams({
      limit: String(BINANCE_PUBLIC_OPEN_INTEREST_LIMIT),
      period: params.interval,
      symbol: params.symbol,
    }),
  });

  return sortByBegin(
    rows.map((row) =>
      toFlatCandle({
        begin: row.timestamp,
        value: toNumber(row.sumOpenInterestValue),
      }),
    ),
  );
}

async function fetchBinancePublicTakerFlow(params: {
  apiBaseUrl: string;
  interval: string;
  symbol: DashboardPair["symbol"];
}): Promise<BinancePublicAggressiveFlow> {
  const rows = await requestBinancePublic({
    apiBaseUrl: params.apiBaseUrl,
    path: "/futures/data/takerlongshortRatio",
    responseSchema: z.array(takerFlowRowSchema),
    searchParams: new URLSearchParams({
      limit: String(BINANCE_PUBLIC_TAKER_FLOW_LIMIT),
      period: params.interval,
      symbol: params.symbol,
    }),
  });
  const latestRow = rows[rows.length - 1];

  if (!latestRow) {
    throw new Error(`Binance public taker flow is empty for ${params.symbol}.`);
  }

  return {
    buyTradeTurnover: toNumber(latestRow.buyVol),
    sellTradeTurnover: toNumber(latestRow.sellVol),
  };
}

export function getBinancePublicMarketConfig(): BinancePublicMarketConfig {
  return {
    apiBaseUrl: binancePublicEnvSchema.parse(process.env)
      .TRENDX_BINANCE_PUBLIC_API_BASE_URL,
  };
}

export async function fetchBinancePublicPairSnapshot(params: {
  config: BinancePublicMarketConfig;
  interval: string;
  symbol: DashboardPair["symbol"];
}): Promise<BinancePublicPairSnapshot> {
  const refinedPriceCandlesPromise = fetchBinancePublicPriceCandles({
    apiBaseUrl: params.config.apiBaseUrl,
    interval: BINANCE_PUBLIC_REFINED_PRICE_INTERVAL,
    limit: BINANCE_PUBLIC_REFINED_PRICE_LIMIT,
    symbol: params.symbol,
  }).catch((error) => {
    logger.warn("Binance public refined price candles unavailable", {
      error: error instanceof Error ? error.message : String(error),
      interval: BINANCE_PUBLIC_REFINED_PRICE_INTERVAL,
      symbol: params.symbol,
    });

    return null;
  });
  const [
    fundingRateCandles,
    longShortRealtime,
    openInterestCandles,
    priceCandles,
  ] = await Promise.all([
    fetchBinancePublicFundingRateCandles({
      apiBaseUrl: params.config.apiBaseUrl,
      symbol: params.symbol,
    }),
    fetchBinancePublicTakerFlow({
      apiBaseUrl: params.config.apiBaseUrl,
      interval: params.interval,
      symbol: params.symbol,
    }),
    fetchBinancePublicOpenInterestCandles({
      apiBaseUrl: params.config.apiBaseUrl,
      interval: params.interval,
      symbol: params.symbol,
    }),
    fetchBinancePublicPriceCandles({
      apiBaseUrl: params.config.apiBaseUrl,
      interval: params.interval,
      limit: BINANCE_PUBLIC_PRICE_LIMIT,
      symbol: params.symbol,
    }),
  ]);

  return {
    fundingRateCandles,
    liquidations: [],
    longShortRealtime,
    openInterestCandles,
    priceCandles,
    refinedPriceCandles: (await refinedPriceCandlesPromise) ?? priceCandles,
    symbol: trackedSymbolSchema.parse(params.symbol),
  };
}
