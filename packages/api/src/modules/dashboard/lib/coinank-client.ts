import { logger } from "@trendx/logs";
import pLimit from "p-limit";
import { z } from "zod";

import type { DashboardPair } from "../types";

const trackedSymbols = ["BTCUSDT", "ETHUSDT"] as const;
const trackedSymbolSchema = z.enum(trackedSymbols);

const coinankEnvSchema = z.object({
  TRENDX_COINANK_API_BASE_URL: z
    .string()
    .url()
    .default("https://open-api.coinank.com"),
  TRENDX_COINANK_API_KEY: z.string().optional(),
  TRENDX_COINANK_EXCHANGE: z.string().min(1).default("Binance"),
  TRENDX_COINANK_ENABLE_REFINED_PRICE: z.enum(["on", "off"]).default("off"),
  TRENDX_COINANK_PRODUCT_TYPE: z.string().min(1).default("SWAP"),
  TRENDX_DEFAULT_PAIRS: z.string().default("BTCUSDT,ETHUSDT"),
  TRENDX_KILL_SWITCH_DEFAULT: z.enum(["on", "off"]).default("off"),
  TRENDX_SIGNAL_INTERVAL: z.string().min(1).default("1h"),
});

const ohlcPointSchema = z.object({
  begin: z.coerce.number(),
  close: z.coerce.number(),
  high: z.coerce.number(),
  low: z.coerce.number(),
  open: z.coerce.number(),
});

const fundingPointSchema = ohlcPointSchema;

const liquidationPointSchema = z.object({
  exchangeName: z.string(),
  longTurnover: z.coerce.number(),
  shortTurnover: z.coerce.number(),
  symbol: z.string(),
  ts: z.coerce.number(),
});

const longShortRealtimePointSchema = z.object({
  baseCoin: z.string(),
  buyTradeTurnover: z.coerce.number(),
  exchangeName: z.string(),
  sellTradeTurnover: z.coerce.number(),
});

const coinankBooleanSchema = z
  .union([z.boolean(), z.number(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value !== 0;
    }

    return value === "true" || value === "1";
  });

const newsListItemSchema = z.object({
  content: z.string(),
  id: z.string().min(1),
  readNum: z.coerce.number(),
  recommend: coinankBooleanSchema,
  sourceWeb: z.string().min(1),
  title: z.string(),
  ts: z.coerce.number(),
});
const newsPaginationSchema = z.object({
  current: z.coerce.number(),
  pageSize: z.coerce.number(),
  total: z.coerce.number(),
});
const priceRowSchema = z.array(z.union([z.coerce.number(), z.string()])).min(6);
const COINANK_MAX_CONCURRENT_REQUESTS = 2;
const COINANK_MAX_RETRIES = 3;
const COINANK_RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const COINANK_REQUEST_TIMEOUT_MS = 10_000;
const COINANK_PRICE_CANDLE_LIMIT = 72;
const COINANK_REFINED_PRICE_CANDLE_INTERVAL = "15m";
const COINANK_REFINED_PRICE_CANDLE_LIMIT = 192;
const coinankRequestLimiter = pLimit(COINANK_MAX_CONCURRENT_REQUESTS);

interface CoinankEnvelopeShape<T> {
  code?: string;
  data: T;
  msg?: string;
  success: boolean;
}

export interface CoinankDashboardConfig {
  apiBaseUrl: string;
  apiKey: string;
  exchange: string;
  interval: string;
  killSwitchEnabled: boolean;
  productType: string;
  refinedPriceEnabled: boolean;
  trackedPairs: [DashboardPair["symbol"], DashboardPair["symbol"]];
}

export interface CoinankCandle {
  begin: number;
  close: number;
  high: number;
  low: number;
  open: number;
}

export interface CoinankLiquidationPoint {
  longTurnover: number;
  shortTurnover: number;
  ts: number;
}

export interface CoinankLongShortRealtimePoint {
  buyTradeTurnover: number;
  sellTradeTurnover: number;
}

export interface CoinankNewsItem {
  content: string;
  id: string;
  readNum: number;
  recommend: boolean;
  sourceWeb: string;
  title: string;
  ts: number;
}

export interface CoinankNewsListResult {
  items: CoinankNewsItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CoinankPairSnapshot {
  fundingRateCandles: CoinankCandle[];
  liquidations: CoinankLiquidationPoint[];
  longShortRealtime: CoinankLongShortRealtimePoint;
  openInterestCandles: CoinankCandle[];
  priceCandles: CoinankCandle[];
  refinedPriceCandles: CoinankCandle[];
  symbol: DashboardPair["symbol"];
}

function isTrackedSymbol(value: string): value is DashboardPair["symbol"] {
  return trackedSymbols.includes(value as DashboardPair["symbol"]);
}

function normalizeTrackedPairs(
  value: string,
): [DashboardPair["symbol"], DashboardPair["symbol"]] {
  const uniquePairs = Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(isTrackedSymbol),
    ),
  );

  if (uniquePairs.length === 2) {
    const firstPair = trackedSymbolSchema.parse(uniquePairs[0]);
    const secondPair = trackedSymbolSchema.parse(uniquePairs[1]);

    return [firstPair, secondPair];
  }

  return ["BTCUSDT", "ETHUSDT"];
}

function getBaseCoin(symbol: DashboardPair["symbol"]): string {
  return symbol.replace(/USDT$/, "");
}

function toCoinankCandle(row: z.infer<typeof priceRowSchema>): CoinankCandle {
  const rawBegin = Number(row[0]);
  const rawOpen = Number(row[2]);
  const rawClose = Number(row[3]);
  const rawHigh = Number(row[4]);
  const rawLow = Number(row[5]);

  const hasInvalidValue =
    !Number.isFinite(rawBegin) ||
    !Number.isFinite(rawOpen) ||
    !Number.isFinite(rawClose) ||
    !Number.isFinite(rawHigh) ||
    !Number.isFinite(rawLow);

  if (hasInvalidValue) {
    throw new Error("Coinank returned an invalid kline row.");
  }

  return {
    begin: rawBegin,
    close: rawClose,
    high: Math.max(rawHigh, rawLow),
    low: Math.min(rawHigh, rawLow),
    open: rawOpen,
  };
}

function parseEnvelope<T>(
  payload: unknown,
  dataSchema: z.ZodType<T>,
): CoinankEnvelopeShape<T> {
  const envelopeSchema = z.object({
    code: z.string().optional(),
    data: dataSchema,
    msg: z.string().optional(),
    success: z.boolean(),
  });

  return envelopeSchema.parse(payload);
}

function calculateRetryDelay(attempt: number): number {
  return 600 * 2 ** (attempt - 1) + Math.round(Math.random() * 250);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function requestCoinank<T>(
  config: CoinankDashboardConfig,
  path: string,
  params: Record<string, string | number>,
  dataSchema: z.ZodType<T>,
  options?: {
    failureLogLevel?: "error" | "warn";
  },
): Promise<T> {
  const url = new URL(path, `${config.apiBaseUrl}/`);
  const failureLogLevel = options?.failureLogLevel ?? "error";

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  return await coinankRequestLimiter(async () => {
    for (let attempt = 1; attempt <= COINANK_MAX_RETRIES; attempt += 1) {
      let response: Response;

      try {
        response = await fetch(url, {
          headers: {
            apikey: config.apiKey,
          },
          signal: AbortSignal.timeout(COINANK_REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (attempt < COINANK_MAX_RETRIES) {
          const delay = calculateRetryDelay(attempt);

          logger.warn("Coinank request failed; retrying", {
            attempt,
            delay,
            endpoint: path,
            error: message,
          });
          await sleep(delay);
          continue;
        }

        logger[failureLogLevel]("Coinank request failed", {
          endpoint: path,
          error: message,
        });
        throw new Error(`Coinank request failed for ${path}.`, {
          cause: error,
        });
      }

      if (!response.ok) {
        if (
          attempt < COINANK_MAX_RETRIES &&
          COINANK_RETRYABLE_STATUS_CODES.has(response.status)
        ) {
          const delay = calculateRetryDelay(attempt);

          logger.warn("Coinank returned a retryable status", {
            attempt,
            delay,
            endpoint: path,
            status: response.status,
            statusText: response.statusText,
          });
          await sleep(delay);
          continue;
        }

        logger[failureLogLevel]("Coinank responded with a non-OK status", {
          endpoint: path,
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(`Coinank responded with status ${response.status}.`);
      }

      let parsed: CoinankEnvelopeShape<T>;

      try {
        const json = (await response.json()) as unknown;
        parsed = parseEnvelope(json, dataSchema);
      } catch (error) {
        logger[failureLogLevel]("Coinank response parsing failed", {
          endpoint: path,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new Error(`Coinank response parsing failed for ${path}.`, {
          cause: error,
        });
      }

      if (!parsed.success) {
        logger[failureLogLevel]("Coinank returned an unsuccessful payload", {
          code: parsed.code ?? "unknown",
          endpoint: path,
          message: parsed.msg ?? "No message provided",
        });
        throw new Error(
          `Coinank rejected ${path} with code ${parsed.code ?? "unknown"}.`,
        );
      }

      return parsed.data;
    }

    throw new Error(`Coinank request failed for ${path}.`);
  });
}

async function fetchPriceCandles(
  config: CoinankDashboardConfig,
  symbol: DashboardPair["symbol"],
  options?: {
    interval?: string;
    size?: number;
  },
): Promise<CoinankCandle[]> {
  const rows = await requestCoinank(
    config,
    "/api/kline/lists",
    {
      endTime: Date.now(),
      exchange: config.exchange,
      interval: options?.interval ?? config.interval,
      productType: config.productType,
      size: options?.size ?? COINANK_PRICE_CANDLE_LIMIT,
      symbol,
    },
    z.array(priceRowSchema),
  );

  return rows.map(toCoinankCandle);
}

async function fetchOpenInterestCandles(
  config: CoinankDashboardConfig,
  symbol: DashboardPair["symbol"],
): Promise<CoinankCandle[]> {
  const points = await requestCoinank(
    config,
    "/api/openInterest/kline",
    {
      endTime: Date.now(),
      exchange: config.exchange,
      interval: config.interval,
      size: 24,
      symbol,
    },
    z.array(ohlcPointSchema),
  );

  return points;
}

async function fetchFundingRateCandles(
  config: CoinankDashboardConfig,
  symbol: DashboardPair["symbol"],
): Promise<CoinankCandle[]> {
  const points = await requestCoinank(
    config,
    "/api/fundingRate/kline",
    {
      endTime: Date.now(),
      exchange: config.exchange,
      interval: config.interval,
      size: 24,
      symbol,
    },
    z.array(fundingPointSchema),
  );

  return points;
}

async function fetchLiquidationHistory(
  config: CoinankDashboardConfig,
  symbol: DashboardPair["symbol"],
): Promise<CoinankLiquidationPoint[]> {
  const points = await requestCoinank(
    config,
    "/api/liquidation/history",
    {
      endTime: Date.now(),
      exchange: config.exchange,
      interval: config.interval,
      size: 24,
      symbol,
    },
    z.array(liquidationPointSchema),
  );

  return points.map((point) => ({
    longTurnover: point.longTurnover,
    shortTurnover: point.shortTurnover,
    ts: point.ts,
  }));
}

async function fetchLongShortRealtime(
  config: CoinankDashboardConfig,
  symbol: DashboardPair["symbol"],
): Promise<CoinankLongShortRealtimePoint> {
  const points = await requestCoinank(
    config,
    "/api/longshort/realtimeAll",
    {
      baseCoin: getBaseCoin(symbol),
      interval: config.interval,
    },
    z.array(longShortRealtimePointSchema),
  );

  const exchangePoint = points.find(
    (point) =>
      point.exchangeName.toLowerCase() === config.exchange.toLowerCase(),
  );

  if (!exchangePoint) {
    throw new Error(
      `Coinank did not return taker flow data for ${config.exchange} ${symbol}.`,
    );
  }

  return {
    buyTradeTurnover: exchangePoint.buyTradeTurnover,
    sellTradeTurnover: exchangePoint.sellTradeTurnover,
  };
}

export async function fetchCoinankNewsList(
  config: CoinankDashboardConfig,
  options: {
    importantOnly: boolean;
    language: string;
    pageSize: number;
    type: "FLASH" | "NEWS";
  },
): Promise<CoinankNewsListResult> {
  const payload = await requestCoinank(
    config,
    "/api/news/getNewsList",
    {
      isPopular: options.importantOnly ? "true" : "false",
      lang: options.language,
      page: 1,
      pageSize: options.pageSize,
      search: "",
      type: options.type === "FLASH" ? "1" : "2",
    },
    z.object({
      list: z.array(newsListItemSchema),
      pagination: newsPaginationSchema,
    }),
  );

  return {
    items: payload.list.map((item) => ({
      content: item.content,
      id: item.id,
      readNum: item.readNum,
      recommend: item.recommend,
      sourceWeb: item.sourceWeb,
      title: item.title,
      ts: item.ts,
    })),
    page: payload.pagination.current,
    pageSize: payload.pagination.pageSize,
    total: payload.pagination.total,
  };
}

export function getCoinankDashboardConfig(): CoinankDashboardConfig | null {
  const env = coinankEnvSchema.parse(process.env);
  const apiKey = env.TRENDX_COINANK_API_KEY?.trim() ?? "";

  if (!apiKey) {
    return null;
  }

  return {
    apiBaseUrl: env.TRENDX_COINANK_API_BASE_URL,
    apiKey,
    exchange: env.TRENDX_COINANK_EXCHANGE,
    interval: env.TRENDX_SIGNAL_INTERVAL,
    killSwitchEnabled: env.TRENDX_KILL_SWITCH_DEFAULT === "on",
    productType: env.TRENDX_COINANK_PRODUCT_TYPE,
    refinedPriceEnabled: env.TRENDX_COINANK_ENABLE_REFINED_PRICE === "on",
    trackedPairs: normalizeTrackedPairs(env.TRENDX_DEFAULT_PAIRS),
  };
}

export async function fetchCoinankPairSnapshot(
  config: CoinankDashboardConfig,
  symbol: DashboardPair["symbol"],
): Promise<CoinankPairSnapshot> {
  const refinedPriceCandlesPromise = config.refinedPriceEnabled
    ? fetchPriceCandles(config, symbol, {
        interval: COINANK_REFINED_PRICE_CANDLE_INTERVAL,
        size: COINANK_REFINED_PRICE_CANDLE_LIMIT,
      }).catch((error) => {
        logger.warn(
          "Coinank refined price candles unavailable; using primary interval",
          {
            error: error instanceof Error ? error.message : String(error),
            interval: COINANK_REFINED_PRICE_CANDLE_INTERVAL,
            symbol,
          },
        );

        return null;
      })
    : Promise.resolve(null);
  const [
    fundingRateCandles,
    liquidations,
    longShortRealtime,
    openInterestCandles,
    priceCandles,
  ] = await Promise.all([
    fetchFundingRateCandles(config, symbol),
    fetchLiquidationHistory(config, symbol),
    fetchLongShortRealtime(config, symbol),
    fetchOpenInterestCandles(config, symbol),
    fetchPriceCandles(config, symbol),
  ]);
  const refinedPriceCandles =
    (await refinedPriceCandlesPromise) ?? priceCandles;

  return {
    fundingRateCandles,
    liquidations,
    longShortRealtime,
    openInterestCandles,
    priceCandles,
    refinedPriceCandles,
    symbol,
  };
}
