import { schema } from "@trendx/database";
import { and, desc, eq } from "@trendx/database/drizzle/operators";
import { logger } from "@trendx/logs";
import { z } from "zod";

import { getDatabaseClient } from "../../../lib/database";
import type { DashboardPair } from "../types";
import {
  type CoinankDashboardConfig,
  fetchCoinankPairSnapshot,
  getCoinankDashboardConfig,
} from "./coinank-client";
import { buildSeededDashboardPair } from "./seed-overview";

const COINANK_LIVE_NOTE =
  "Coinank live market data loaded for dashboard pairs.";
const COINANK_MISSING_KEY_NOTE =
  "Coinank API key missing. Serving seeded dashboard overview.";
const COINANK_DATABASE_MISSING_KEY_FALLBACK_NOTE =
  "Local database market snapshots are serving as fallback because Coinank is not configured.";
const COINANK_DATABASE_FALLBACK_NOTE =
  "Local database market snapshots are serving as fallback after Coinank fetch failures.";
const LOCAL_DB_LIVE_NOTE =
  "Local database market snapshots loaded for dashboard pairs.";
const LOCAL_DB_EMPTY_NOTE =
  "Local database market snapshots are not ready yet. Serving seeded dashboard overview.";
const LOCAL_DB_MISSING_DATABASE_NOTE =
  "DATABASE_URL is missing; local database market snapshots are unavailable. Serving seeded dashboard overview.";
const LOCAL_DB_STALE_NOTE =
  "Local database market snapshots are stale. Serving seeded dashboard overview.";
const trackedSymbols = ["BTCUSDT", "ETHUSDT"] as const;
const trackedSymbolSchema = z.enum(trackedSymbols);

const marketDataProviderEnvSchema = z.object({
  TRENDX_DEFAULT_PAIRS: z.string().default("BTCUSDT,ETHUSDT"),
  TRENDX_MARKET_DATA_PROVIDER: z
    .enum(["coinank", "local-db"])
    .default("coinank"),
  TRENDX_SIGNAL_CYCLE_MARKET_DATA_PROVIDER: z
    .enum(["coinank", "local-db"])
    .default("coinank"),
  TRENDX_SIGNAL_INTERVAL: z.string().min(1).default("1h"),
});

export type DashboardMarketDataMode = "fallback" | "live" | "mixed";
export type DashboardMarketDataPairMode = "fallback" | "live";
export type DashboardMarketDataPairSource = "coinank" | "database" | "seeded";
export type DashboardMarketDataSource =
  | "coinank"
  | "database"
  | "mixed"
  | "seeded";
export type DashboardMarketDataProviderKind = "coinank" | "local-db";

export interface DashboardMarketDataCandle {
  begin: number;
  close: number;
  high: number;
  low: number;
  open: number;
}

export interface DashboardMarketDataLiquidationPoint {
  longTurnover: number;
  shortTurnover: number;
  ts: number;
}

export interface DashboardMarketDataAggressiveFlow {
  buyTradeTurnover: number;
  sellTradeTurnover: number;
}

export interface DashboardMarketDataSnapshot {
  cvdBiasPct: number | null;
  fundingRateCandles: DashboardMarketDataCandle[];
  interval: string;
  liquidations: DashboardMarketDataLiquidationPoint[];
  longShortRealtime: DashboardMarketDataAggressiveFlow;
  openInterestCandles: DashboardMarketDataCandle[];
  priceCandles: DashboardMarketDataCandle[];
  refinedPriceCandles: DashboardMarketDataCandle[];
  symbol: DashboardPair["symbol"];
}

export interface DashboardMarketDataPairFeed {
  capturedAt: string | null;
  mode: DashboardMarketDataPairMode;
  note: string;
  source: DashboardMarketDataPairSource;
  symbol: DashboardPair["symbol"];
}

export interface DashboardMarketDataPairResult {
  fallbackPair: DashboardPair;
  feed: DashboardMarketDataPairFeed;
  snapshot: DashboardMarketDataSnapshot | null;
}

export interface DashboardMarketDataProviderResult {
  killSwitchEnabled: boolean;
  mode: DashboardMarketDataMode;
  notes: string[];
  pairs: DashboardMarketDataPairResult[];
  source: DashboardMarketDataSource;
}

interface DashboardMarketDataRuntimeConfig {
  provider: DashboardMarketDataProviderKind;
  signalCycleProvider: DashboardMarketDataProviderKind;
  timeframe: string;
  trackedPairs: [DashboardPair["symbol"], DashboardPair["symbol"]];
}

const marketDataSnapshotSchema = z.object({
  cvdBiasPct: z.number().nullable(),
  fundingRateCandles: z.array(
    z.object({
      begin: z.number(),
      close: z.number(),
      high: z.number(),
      low: z.number(),
      open: z.number(),
    }),
  ),
  interval: z.string().min(1),
  liquidations: z.array(
    z.object({
      longTurnover: z.number(),
      shortTurnover: z.number(),
      ts: z.number(),
    }),
  ),
  longShortRealtime: z.object({
    buyTradeTurnover: z.number(),
    sellTradeTurnover: z.number(),
  }),
  openInterestCandles: z.array(
    z.object({
      begin: z.number(),
      close: z.number(),
      high: z.number(),
      low: z.number(),
      open: z.number(),
    }),
  ),
  priceCandles: z.array(
    z.object({
      begin: z.number(),
      close: z.number(),
      high: z.number(),
      low: z.number(),
      open: z.number(),
    }),
  ),
  refinedPriceCandles: z.array(
    z.object({
      begin: z.number(),
      close: z.number(),
      high: z.number(),
      low: z.number(),
      open: z.number(),
    }),
  ),
  symbol: trackedSymbolSchema,
});

const persistedMarketSnapshotPayloadSchema = z.object({
  marketDataSnapshot: marketDataSnapshotSchema.nullable().optional(),
});
const persistedMarketDataInputFeedSchema = z.object({
  capturedAt: z.string().datetime().nullable().optional(),
  mode: z.enum(["fallback", "live"]),
  note: z.string().min(1),
  source: z.enum(["coinank", "database", "seeded"]),
  symbol: trackedSymbolSchema,
});

function normalizeTrackedPairs(
  rawPairs: string,
): [DashboardPair["symbol"], DashboardPair["symbol"]] {
  const parsedPairs = rawPairs
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is DashboardPair["symbol"] =>
      trackedSymbols.includes(value as DashboardPair["symbol"]),
    );

  if (parsedPairs.length >= 2) {
    const firstPair = parsedPairs[0];
    const secondPair = parsedPairs[1];

    if (firstPair && secondPair) {
      return [firstPair, secondPair];
    }
  }

  if (parsedPairs[0]) {
    return [
      parsedPairs[0],
      parsedPairs[0] === "BTCUSDT" ? "ETHUSDT" : "BTCUSDT",
    ];
  }

  return ["BTCUSDT", "ETHUSDT"];
}

function getMarketDataRuntimeConfig(): DashboardMarketDataRuntimeConfig {
  const env = marketDataProviderEnvSchema.parse(process.env);

  return {
    provider: env.TRENDX_MARKET_DATA_PROVIDER,
    signalCycleProvider: env.TRENDX_SIGNAL_CYCLE_MARKET_DATA_PROVIDER,
    timeframe: env.TRENDX_SIGNAL_INTERVAL,
    trackedPairs: normalizeTrackedPairs(env.TRENDX_DEFAULT_PAIRS),
  };
}

function getIntervalDurationMs(interval: string): number {
  const match = interval
    .trim()
    .toLowerCase()
    .match(/^(\d+)(m|h|d)$/);

  if (!match) {
    return 60 * 60 * 1000;
  }

  const [, rawValue, rawUnit] = match;
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value <= 0) {
    return 60 * 60 * 1000;
  }

  if (rawUnit === "m") {
    return value * 60 * 1000;
  }

  if (rawUnit === "h") {
    return value * 60 * 60 * 1000;
  }

  return value * 24 * 60 * 60 * 1000;
}

function resolveMarketDataMode(
  pairs: DashboardMarketDataPairResult[],
): DashboardMarketDataMode {
  const liveCount = pairs.filter((pair) => pair.feed.mode === "live").length;

  if (liveCount === 0) {
    return "fallback";
  }

  if (liveCount === pairs.length) {
    return "live";
  }

  return "mixed";
}

function hasAnyLivePair(pairs: DashboardMarketDataPairResult[]): boolean {
  return pairs.some((pair) => pair.feed.mode === "live");
}

function toMarketDataSnapshot(params: {
  interval: string;
  snapshot: Awaited<ReturnType<typeof fetchCoinankPairSnapshot>>;
}): DashboardMarketDataSnapshot {
  return {
    cvdBiasPct: null,
    fundingRateCandles: params.snapshot.fundingRateCandles,
    interval: params.interval,
    liquidations: params.snapshot.liquidations,
    longShortRealtime: params.snapshot.longShortRealtime,
    openInterestCandles: params.snapshot.openInterestCandles,
    priceCandles: params.snapshot.priceCandles,
    refinedPriceCandles: params.snapshot.refinedPriceCandles,
    symbol: params.snapshot.symbol,
  };
}

function createSeededPairResult(params: {
  note: string;
  symbol: DashboardPair["symbol"];
}): DashboardMarketDataPairResult {
  return {
    fallbackPair: buildSeededDashboardPair(params.symbol),
    feed: {
      capturedAt: null,
      mode: "fallback",
      note: params.note,
      source: "seeded",
      symbol: params.symbol,
    },
    snapshot: null,
  };
}

function toIsoTimestamp(value: number): string | null {
  const normalizedValue = value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function resolveAggregateMarketDataSource(
  pairs: DashboardMarketDataPairResult[],
  mode: DashboardMarketDataMode,
): DashboardMarketDataSource {
  if (mode === "fallback") {
    return "seeded";
  }

  if (mode === "mixed") {
    return "mixed";
  }

  const liveSources = new Set(
    pairs
      .filter((pair) => pair.feed.mode === "live")
      .map((pair) => pair.feed.source)
      .filter(
        (
          source,
        ): source is Extract<
          DashboardMarketDataPairSource,
          "coinank" | "database"
        > => source === "coinank" || source === "database",
      ),
  );

  if (liveSources.size !== 1) {
    return "mixed";
  }

  return Array.from(liveSources)[0] ?? "mixed";
}

async function loadCoinankSnapshot(
  config: CoinankDashboardConfig,
  symbol: DashboardPair["symbol"],
): Promise<DashboardMarketDataPairResult> {
  const fallbackPair = buildSeededDashboardPair(symbol);

  try {
    const snapshot = await fetchCoinankPairSnapshot(config, symbol);

    return {
      fallbackPair,
      feed: {
        capturedAt:
          toIsoTimestamp(snapshot.priceCandles.at(-1)?.begin ?? Date.now()) ??
          new Date().toISOString(),
        mode: "live",
        note: COINANK_LIVE_NOTE,
        source: "coinank",
        symbol,
      },
      snapshot: toMarketDataSnapshot({
        interval: config.interval,
        snapshot,
      }),
    };
  } catch (error) {
    logger.warn("Falling back to seeded pair after Coinank fetch failure", {
      error: error instanceof Error ? error.message : String(error),
      symbol,
    });

    const databaseFallback = await loadDatabaseSnapshot({
      symbol,
      timeframe: config.interval,
    });

    if (databaseFallback.snapshot) {
      return {
        ...databaseFallback,
        feed: {
          ...databaseFallback.feed,
          note: buildDatabaseFallbackAfterCoinankFailureNote(symbol),
        },
      };
    }

    return {
      fallbackPair,
      feed: {
        capturedAt: null,
        mode: "fallback",
        note: `${symbol} is using seeded fallback data after a Coinank fetch failure.`,
        source: "seeded",
        symbol,
      },
      snapshot: null,
    };
  }
}

function buildLocalDbMissingSnapshotNote(
  symbol: DashboardPair["symbol"],
): string {
  return `${symbol} has no persisted local market snapshot yet. Serving seeded fallback data.`;
}

function buildLocalDbStaleSnapshotNote(
  symbol: DashboardPair["symbol"],
): string {
  return `${symbol} local market snapshot is stale. Serving seeded fallback data.`;
}

function buildDatabaseFallbackAfterCoinankFailureNote(
  symbol: DashboardPair["symbol"],
): string {
  return `${symbol} is using local database fallback data after a Coinank fetch failure.`;
}

async function loadDatabaseSnapshot(params: {
  symbol: DashboardPair["symbol"];
  timeframe: string;
}): Promise<DashboardMarketDataPairResult> {
  const db = getDatabaseClient();

  if (!db) {
    return createSeededPairResult({
      note: LOCAL_DB_MISSING_DATABASE_NOTE,
      symbol: params.symbol,
    });
  }

  const [inputRow] = await db
    .select({
      capturedAt: schema.marketDataInputs.capturedAt,
      feed: schema.marketDataInputs.feed,
      providerSource: schema.marketDataInputs.providerSource,
      snapshot: schema.marketDataInputs.snapshot,
    })
    .from(schema.marketDataInputs)
    .where(
      and(
        eq(schema.marketDataInputs.symbol, params.symbol),
        eq(schema.marketDataInputs.timeframe, params.timeframe),
      ),
    )
    .orderBy(desc(schema.marketDataInputs.capturedAt))
    .limit(1);

  if (inputRow) {
    const persistedInputRow = inputRow;
    const parsedFeed = persistedMarketDataInputFeedSchema.safeParse(
      persistedInputRow.feed,
    );
    const parsedSnapshot = marketDataSnapshotSchema.safeParse(
      persistedInputRow.snapshot,
    );
    const maxAgeMs = getIntervalDurationMs(params.timeframe) * 2;
    const snapshotAgeMs = Date.now() - persistedInputRow.capturedAt.getTime();

    if (snapshotAgeMs > maxAgeMs) {
      logger.warn("Persisted market_data_inputs row is stale", {
        capturedAt: persistedInputRow.capturedAt.toISOString(),
        providerSource: persistedInputRow.providerSource,
        symbol: params.symbol,
      });

      return createSeededPairResult({
        note: buildLocalDbStaleSnapshotNote(params.symbol),
        symbol: params.symbol,
      });
    }

    if (parsedFeed.success && parsedSnapshot.success) {
      return {
        fallbackPair: buildSeededDashboardPair(params.symbol),
        feed: {
          capturedAt: persistedInputRow.capturedAt.toISOString(),
          mode: "live",
          note: LOCAL_DB_LIVE_NOTE,
          source: "database",
          symbol: params.symbol,
        },
        snapshot: parsedSnapshot.data,
      };
    }

    logger.warn("Persisted market_data_inputs row is invalid", {
      capturedAt: inputRow.capturedAt.toISOString(),
      providerSource: inputRow.providerSource,
      symbol: params.symbol,
    });
  }

  const [snapshotRow] = await db
    .select({
      capturedAt: schema.marketSnapshots.capturedAt,
      rawPayload: schema.marketSnapshots.rawPayload,
    })
    .from(schema.marketSnapshots)
    .where(
      and(
        eq(schema.marketSnapshots.symbol, params.symbol),
        eq(schema.marketSnapshots.timeframe, params.timeframe),
      ),
    )
    .orderBy(desc(schema.marketSnapshots.capturedAt))
    .limit(1);

  if (!snapshotRow) {
    return createSeededPairResult({
      note: buildLocalDbMissingSnapshotNote(params.symbol),
      symbol: params.symbol,
    });
  }

  const parsedPayload = persistedMarketSnapshotPayloadSchema.safeParse(
    snapshotRow.rawPayload,
  );

  if (!parsedPayload.success || !parsedPayload.data.marketDataSnapshot) {
    logger.warn("Persisted local market snapshot is missing normalized input", {
      capturedAt: snapshotRow.capturedAt.toISOString(),
      symbol: params.symbol,
    });

    return createSeededPairResult({
      note: buildLocalDbMissingSnapshotNote(params.symbol),
      symbol: params.symbol,
    });
  }

  return {
    fallbackPair: buildSeededDashboardPair(params.symbol),
    feed: {
      capturedAt: snapshotRow.capturedAt.toISOString(),
      mode: "live",
      note: LOCAL_DB_LIVE_NOTE,
      source: "database",
      symbol: params.symbol,
    },
    snapshot: parsedPayload.data.marketDataSnapshot,
  };
}

async function loadDashboardMarketDataFromDatabase(
  runtimeConfig: DashboardMarketDataRuntimeConfig,
): Promise<DashboardMarketDataProviderResult> {
  const db = getDatabaseClient();

  if (!db) {
    return {
      killSwitchEnabled: false,
      mode: "fallback",
      notes: [LOCAL_DB_MISSING_DATABASE_NOTE],
      pairs: runtimeConfig.trackedPairs.map((symbol) =>
        createSeededPairResult({
          note: LOCAL_DB_MISSING_DATABASE_NOTE,
          symbol,
        }),
      ),
      source: "seeded",
    };
  }

  const pairs = await Promise.all(
    runtimeConfig.trackedPairs.map((symbol) =>
      loadDatabaseSnapshot({
        symbol,
        timeframe: runtimeConfig.timeframe,
      }),
    ),
  );
  const mode = resolveMarketDataMode(pairs);
  const summaryNote =
    mode === "fallback"
      ? pairs.some((pair) => pair.feed.note.includes("stale"))
        ? LOCAL_DB_STALE_NOTE
        : LOCAL_DB_EMPTY_NOTE
      : LOCAL_DB_LIVE_NOTE;

  return {
    killSwitchEnabled: false,
    mode,
    notes: [
      summaryNote,
      ...pairs
        .filter((pair) => pair.feed.mode === "fallback")
        .map((pair) => pair.feed.note),
    ],
    pairs,
    source: resolveAggregateMarketDataSource(pairs, mode),
  };
}

export async function loadDashboardMarketData(params?: {
  provider?: DashboardMarketDataProviderKind;
}): Promise<DashboardMarketDataProviderResult> {
  const runtimeConfig = getMarketDataRuntimeConfig();
  const provider = params?.provider ?? runtimeConfig.provider;

  if (provider === "local-db") {
    return await loadDashboardMarketDataFromDatabase(runtimeConfig);
  }

  const config = getCoinankDashboardConfig();

  if (!config) {
    const databaseFallback =
      await loadDashboardMarketDataFromDatabase(runtimeConfig);

    if (hasAnyLivePair(databaseFallback.pairs)) {
      return {
        ...databaseFallback,
        notes: [
          COINANK_DATABASE_MISSING_KEY_FALLBACK_NOTE,
          ...databaseFallback.notes.filter(
            (note) => note !== LOCAL_DB_LIVE_NOTE,
          ),
        ],
      };
    }

    const pairs = runtimeConfig.trackedPairs.map((symbol) =>
      buildSeededDashboardPair(symbol),
    );

    return {
      killSwitchEnabled: false,
      mode: "fallback",
      notes: [COINANK_MISSING_KEY_NOTE],
      pairs: pairs.map((fallbackPair) => ({
        fallbackPair,
        feed: {
          capturedAt: null,
          mode: "fallback",
          note: COINANK_MISSING_KEY_NOTE,
          source: "seeded",
          symbol: fallbackPair.symbol,
        },
        snapshot: null,
      })),
      source: "seeded",
    };
  }

  const pairs = await Promise.all(
    config.trackedPairs.map((symbol) => loadCoinankSnapshot(config, symbol)),
  );
  const mode = resolveMarketDataMode(pairs);

  return {
    killSwitchEnabled: config.killSwitchEnabled,
    mode,
    notes: [
      pairs.some((pair) => pair.feed.source === "database")
        ? COINANK_DATABASE_FALLBACK_NOTE
        : COINANK_LIVE_NOTE,
      ...pairs
        .filter((pair) => pair.feed.mode === "fallback")
        .map((pair) => pair.feed.note),
    ],
    pairs,
    source: resolveAggregateMarketDataSource(pairs, mode),
  };
}

export async function loadDashboardMarketDataForSignalCycle(): Promise<DashboardMarketDataProviderResult> {
  const runtimeConfig = getMarketDataRuntimeConfig();

  return await loadDashboardMarketData({
    provider: runtimeConfig.signalCycleProvider,
  });
}
