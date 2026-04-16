import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { logger } from "@trendx/logs";
import pLimit from "p-limit";
import { z } from "zod";

import type { DashboardPair } from "../../dashboard/types";

const trackedSymbols = ["BTCUSDT", "ETHUSDT"] as const;
const trackedSymbolSchema = z.enum(trackedSymbols);
const OKX_PUBLIC_PRICE_LIMIT = 72;
const OKX_PUBLIC_FUNDING_LIMIT = 24;
const OKX_PUBLIC_OI_LIMIT = 24;
const OKX_PUBLIC_REFINED_PRICE_LIMIT = 192;
const OKX_PUBLIC_REFINED_INTERVAL = "15m";
const OKX_PUBLIC_TIMEOUT_MS = 10_000;
const execFileAsync = promisify(execFile);
const okxPublicRequestLimiter = pLimit(2);

const okxPublicEnvSchema = z.object({
  TRENDX_OKX_PUBLIC_API_BASE_URL: z.string().url().default("https://okx.com"),
  TRENDX_OKX_ENABLE_REFINED_PRICE: z.enum(["on", "off"]).default("off"),
  TRENDX_OKX_PUBLIC_TRANSPORT: z
    .enum(["auto", "fetch", "powershell"])
    .default("auto"),
});

const okxEnvelopeSchema = <TData extends z.ZodTypeAny>(dataSchema: TData) =>
  z.object({
    code: z.string(),
    data: dataSchema,
    msg: z.string(),
  });

const okxFundingHistoryRowSchema = z.object({
  fundingRate: z.string(),
  fundingTime: z.string(),
  instId: z.string(),
});
const okxKlineRowSchema = z.array(z.string()).min(6);
const okxRubikRowSchema = z.array(z.string()).min(3);

export interface OkxPublicMarketConfig {
  apiBaseUrl: string;
  refinedPriceEnabled: boolean;
  transport: "auto" | "fetch" | "powershell";
}

export interface OkxPublicMarketCandle {
  begin: number;
  close: number;
  high: number;
  low: number;
  open: number;
}

export interface OkxPublicAggressiveFlow {
  buyTradeTurnover: number;
  sellTradeTurnover: number;
}

export interface OkxPublicPairSnapshot {
  fundingRateCandles: OkxPublicMarketCandle[];
  liquidations: [];
  longShortRealtime: OkxPublicAggressiveFlow;
  openInterestCandles: OkxPublicMarketCandle[];
  priceCandles: OkxPublicMarketCandle[];
  refinedPriceCandles: OkxPublicMarketCandle[];
  symbol: DashboardPair["symbol"];
}

function toNumber(value: string | number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getOkxInstrumentId(symbol: DashboardPair["symbol"]): string {
  if (symbol === "BTCUSDT") {
    return "BTC-USDT-SWAP";
  }

  return "ETH-USDT-SWAP";
}

function getOkxBaseCurrency(symbol: DashboardPair["symbol"]): string {
  return symbol.replace("USDT", "");
}

function toOkxBar(interval: string): string {
  const normalized = interval.trim().toLowerCase();

  if (normalized === "1h") {
    return "1H";
  }

  if (normalized === "4h") {
    return "4H";
  }

  if (normalized === "1d") {
    return "1D";
  }

  return normalized;
}

function sortByBegin<T extends { begin: number }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => left.begin - right.begin);
}

function toMarketCandle(
  row: z.infer<typeof okxKlineRowSchema>,
): OkxPublicMarketCandle {
  return {
    begin: toNumber(row[0] ?? 0),
    close: toNumber(row[4] ?? 0),
    high: toNumber(row[2] ?? 0),
    low: toNumber(row[3] ?? 0),
    open: toNumber(row[1] ?? 0),
  };
}

function toFlatCandle(params: {
  begin: number;
  value: number;
}): OkxPublicMarketCandle {
  return {
    begin: params.begin,
    close: params.value,
    high: params.value,
    low: params.value,
    open: params.value,
  };
}

async function requestOkxPublic<TData>(params: {
  apiBaseUrl: string;
  path: string;
  responseSchema: z.ZodSchema<TData>;
  searchParams: URLSearchParams;
  transport: OkxPublicMarketConfig["transport"];
}): Promise<TData> {
  const url = new URL(`${params.apiBaseUrl}${params.path}`);
  url.search = params.searchParams.toString();

  return await okxPublicRequestLimiter(async () => {
    let payloadJson: unknown;
    const shouldUsePowerShellFirst =
      params.transport === "powershell" ||
      (params.transport === "auto" && process.platform === "win32");

    try {
      if (shouldUsePowerShellFirst) {
        throw new Error("powershell_transport_selected");
      }

      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(OKX_PUBLIC_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(
          `OKX public request failed with status ${response.status} for ${params.path}.`,
        );
      }

      payloadJson = await response.json();
    } catch (error) {
      if (process.platform !== "win32" || params.transport === "fetch") {
        throw error;
      }

      if (!shouldUsePowerShellFirst) {
        logger.warn(
          "Falling back to PowerShell transport for OKX public request",
          {
            error: error instanceof Error ? error.message : String(error),
            path: params.path,
          },
        );
      }

      const command =
        `$ProgressPreference='SilentlyContinue'; ` +
        `(Invoke-WebRequest -UseBasicParsing '${url.toString()}' -TimeoutSec 30).Content`;
      const result = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-Command", command],
        {
          maxBuffer: 1024 * 1024 * 4,
        },
      );

      payloadJson = JSON.parse(result.stdout);
    }

    const payload = okxEnvelopeSchema(params.responseSchema).parse(payloadJson);

    if (payload.code !== "0") {
      throw new Error(
        `OKX public request failed for ${params.path}: ${payload.msg}`,
      );
    }

    return payload.data;
  });
}

async function fetchOkxPublicPriceCandles(params: {
  apiBaseUrl: string;
  interval: string;
  limit: number;
  symbol: DashboardPair["symbol"];
  transport: OkxPublicMarketConfig["transport"];
}): Promise<OkxPublicMarketCandle[]> {
  const rows = await requestOkxPublic({
    apiBaseUrl: params.apiBaseUrl,
    path: "/api/v5/market/history-candles",
    responseSchema: z.array(okxKlineRowSchema),
    searchParams: new URLSearchParams({
      bar: toOkxBar(params.interval),
      instId: getOkxInstrumentId(params.symbol),
      limit: String(params.limit),
    }),
    transport: params.transport,
  });

  return sortByBegin(rows.map(toMarketCandle));
}

async function fetchOkxPublicFundingRateCandles(params: {
  apiBaseUrl: string;
  symbol: DashboardPair["symbol"];
  transport: OkxPublicMarketConfig["transport"];
}): Promise<OkxPublicMarketCandle[]> {
  const rows = await requestOkxPublic({
    apiBaseUrl: params.apiBaseUrl,
    path: "/api/v5/public/funding-rate-history",
    responseSchema: z.array(okxFundingHistoryRowSchema),
    searchParams: new URLSearchParams({
      instId: getOkxInstrumentId(params.symbol),
      limit: String(OKX_PUBLIC_FUNDING_LIMIT),
    }),
    transport: params.transport,
  });

  return sortByBegin(
    rows.map((row) =>
      toFlatCandle({
        begin: toNumber(row.fundingTime),
        value: toNumber(row.fundingRate),
      }),
    ),
  );
}

async function fetchOkxPublicOpenInterestCandles(params: {
  apiBaseUrl: string;
  interval: string;
  symbol: DashboardPair["symbol"];
  transport: OkxPublicMarketConfig["transport"];
}): Promise<OkxPublicMarketCandle[]> {
  const rows = await requestOkxPublic({
    apiBaseUrl: params.apiBaseUrl,
    path: "/api/v5/rubik/stat/contracts/open-interest-volume",
    responseSchema: z.array(okxRubikRowSchema),
    searchParams: new URLSearchParams({
      ccy: getOkxBaseCurrency(params.symbol),
      period: toOkxBar(params.interval),
    }),
    transport: params.transport,
  });

  return sortByBegin(
    rows.slice(0, OKX_PUBLIC_OI_LIMIT).map((row) =>
      toFlatCandle({
        begin: toNumber(row[0] ?? 0),
        value: toNumber(row[1] ?? 0),
      }),
    ),
  );
}

async function fetchOkxPublicTakerFlow(params: {
  apiBaseUrl: string;
  interval: string;
  symbol: DashboardPair["symbol"];
  transport: OkxPublicMarketConfig["transport"];
}): Promise<OkxPublicAggressiveFlow> {
  const rows = await requestOkxPublic({
    apiBaseUrl: params.apiBaseUrl,
    path: "/api/v5/rubik/stat/taker-volume",
    responseSchema: z.array(okxRubikRowSchema),
    searchParams: new URLSearchParams({
      ccy: getOkxBaseCurrency(params.symbol),
      instType: "CONTRACTS",
      period: toOkxBar(params.interval),
    }),
    transport: params.transport,
  });
  const latestRow = rows[0];

  if (!latestRow) {
    throw new Error(`OKX public taker volume is empty for ${params.symbol}.`);
  }

  return {
    buyTradeTurnover: toNumber(latestRow[2] ?? 0),
    sellTradeTurnover: toNumber(latestRow[1] ?? 0),
  };
}

export function getOkxPublicMarketConfig(): OkxPublicMarketConfig {
  const env = okxPublicEnvSchema.parse(process.env);

  return {
    apiBaseUrl: env.TRENDX_OKX_PUBLIC_API_BASE_URL,
    refinedPriceEnabled: env.TRENDX_OKX_ENABLE_REFINED_PRICE === "on",
    transport: env.TRENDX_OKX_PUBLIC_TRANSPORT,
  };
}

export async function fetchOkxPublicPairSnapshot(params: {
  config: OkxPublicMarketConfig;
  interval: string;
  symbol: DashboardPair["symbol"];
}): Promise<OkxPublicPairSnapshot> {
  const refinedPriceCandlesPromise = params.config.refinedPriceEnabled
    ? fetchOkxPublicPriceCandles({
        apiBaseUrl: params.config.apiBaseUrl,
        interval: OKX_PUBLIC_REFINED_INTERVAL,
        limit: OKX_PUBLIC_REFINED_PRICE_LIMIT,
        symbol: params.symbol,
        transport: params.config.transport,
      }).catch((error) => {
        logger.warn("OKX public refined price candles unavailable", {
          error: error instanceof Error ? error.message : String(error),
          interval: OKX_PUBLIC_REFINED_INTERVAL,
          symbol: params.symbol,
        });

        return null;
      })
    : Promise.resolve(null);
  const [
    fundingRateCandles,
    longShortRealtime,
    openInterestCandles,
    priceCandles,
  ] = await Promise.all([
    fetchOkxPublicFundingRateCandles({
      apiBaseUrl: params.config.apiBaseUrl,
      symbol: params.symbol,
      transport: params.config.transport,
    }),
    fetchOkxPublicTakerFlow({
      apiBaseUrl: params.config.apiBaseUrl,
      interval: params.interval,
      symbol: params.symbol,
      transport: params.config.transport,
    }),
    fetchOkxPublicOpenInterestCandles({
      apiBaseUrl: params.config.apiBaseUrl,
      interval: params.interval,
      symbol: params.symbol,
      transport: params.config.transport,
    }),
    fetchOkxPublicPriceCandles({
      apiBaseUrl: params.config.apiBaseUrl,
      interval: params.interval,
      limit: OKX_PUBLIC_PRICE_LIMIT,
      symbol: params.symbol,
      transport: params.config.transport,
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
