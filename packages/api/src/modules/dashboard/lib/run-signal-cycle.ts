import { randomUUID } from "node:crypto";

import { schema } from "@trendx/database";
import { and, eq } from "@trendx/database/drizzle/operators";
import { logger } from "@trendx/logs";

import { getRequiredDatabaseClient } from "../../../lib/database";
import { DASHBOARD_EXECUTION_CONFIG } from "../config";
import type { DashboardPair, GetDashboardOverviewOutput } from "../types";
import { buildDashboardOverviewFromMarketData } from "./build-overview";
import {
  type DashboardMarketDataPairFeed,
  type DashboardMarketDataSnapshot,
  loadDashboardMarketDataForSignalCycle,
} from "./market-data-provider";

const DEFAULT_TIMEFRAME = "1h";
const SIGNAL_INTERVAL_PATTERN = /^(\d+)(m|h|d)$/i;

interface PersistedSignalPairSummary {
  action: DashboardPair["action"];
  confirmationCount: number;
  signalId: string;
  snapshotId: string;
  symbol: DashboardPair["symbol"];
  updatedExistingSignal: boolean;
}

export interface RunDashboardSignalCycleResult {
  accountSnapshotId: string;
  cycleCapturedAt: string;
  pairs: PersistedSignalPairSummary[];
  reason: string;
  success: true;
}

function toNumericString(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : (0).toFixed(digits);
}

function toJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function getSignalTimeframe(): string {
  return process.env.TRENDX_SIGNAL_INTERVAL?.trim() || DEFAULT_TIMEFRAME;
}

function getSignalIntervalDurationMs(timeframe: string): number {
  const match = timeframe.match(SIGNAL_INTERVAL_PATTERN);

  if (!match) {
    return 60 * 60 * 1000;
  }

  const [, rawValue, unit] = match;
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value <= 0) {
    return 60 * 60 * 1000;
  }

  if (unit?.toLowerCase() === "m") {
    return value * 60 * 1000;
  }

  if (unit?.toLowerCase() === "h") {
    return value * 60 * 60 * 1000;
  }

  return value * 24 * 60 * 60 * 1000;
}

export function getCycleCapturedAt(
  overviewGeneratedAt: string,
  timeframe: string,
): Date {
  const generatedAtMs = new Date(overviewGeneratedAt).getTime();
  const intervalDurationMs = getSignalIntervalDurationMs(timeframe);

  if (!Number.isFinite(generatedAtMs) || intervalDurationMs <= 0) {
    return new Date();
  }

  return new Date(
    Math.floor(generatedAtMs / intervalDurationMs) * intervalDurationMs,
  );
}

function buildAccountSnapshotValues(
  overview: GetDashboardOverviewOutput["overview"],
  capturedAt: Date,
) {
  return {
    availableMargin: toNumericString(overview.accountRisk.availableMargin, 2),
    capturedAt,
    equity: toNumericString(overview.accountRisk.equity, 2),
    exposurePct: toNumericString(overview.accountRisk.exposurePct, 2),
    openPositionCount: overview.accountRisk.openPositionCount,
    realizedPnl: toNumericString(overview.accountRisk.dailyPnl, 2),
    unrealizedPnl: toNumericString(
      overview.pairs.reduce((sum, pair) => sum + pair.currentPosition.pnl, 0),
      2,
    ),
    usedMargin: toNumericString(overview.accountRisk.usedMargin, 2),
  };
}

async function upsertAccountSnapshot(params: {
  capturedAt: Date;
  overview: GetDashboardOverviewOutput["overview"];
}): Promise<string> {
  const db = getRequiredDatabaseClient();
  const values = buildAccountSnapshotValues(params.overview, params.capturedAt);
  const [existingSnapshot] = await db
    .select({
      id: schema.accountSnapshots.id,
    })
    .from(schema.accountSnapshots)
    .where(eq(schema.accountSnapshots.capturedAt, params.capturedAt))
    .limit(1);

  if (existingSnapshot) {
    await db
      .update(schema.accountSnapshots)
      .set(values)
      .where(eq(schema.accountSnapshots.id, existingSnapshot.id));

    return existingSnapshot.id;
  }

  const accountSnapshotId = randomUUID();

  await db.insert(schema.accountSnapshots).values({
    id: accountSnapshotId,
    ...values,
  });

  return accountSnapshotId;
}

async function upsertMarketDataInputSnapshot(params: {
  capturedAt: Date;
  feed: DashboardMarketDataPairFeed;
  snapshot: DashboardMarketDataSnapshot;
  timeframe: string;
}): Promise<void> {
  const db = getRequiredDatabaseClient();
  const [existingInput] = await db
    .select({
      id: schema.marketDataInputs.id,
    })
    .from(schema.marketDataInputs)
    .where(
      and(
        eq(schema.marketDataInputs.symbol, params.snapshot.symbol),
        eq(schema.marketDataInputs.timeframe, params.timeframe),
        eq(schema.marketDataInputs.capturedAt, params.capturedAt),
      ),
    )
    .limit(1);
  const values = {
    capturedAt: params.capturedAt,
    feed: toJsonObject(params.feed),
    providerSource: params.feed.source,
    snapshot: toJsonObject(params.snapshot),
    symbol: params.snapshot.symbol,
    timeframe: params.timeframe,
    updatedAt: new Date(),
  };

  if (existingInput) {
    await db
      .update(schema.marketDataInputs)
      .set(values)
      .where(eq(schema.marketDataInputs.id, existingInput.id));

    return;
  }

  await db.insert(schema.marketDataInputs).values({
    id: randomUUID(),
    ...values,
  });
}

export async function persistDashboardPairSignalSnapshot(params: {
  capturedAt: Date;
  marketDataFeed?: DashboardMarketDataPairFeed | null;
  marketDataSnapshot?: DashboardMarketDataSnapshot | null;
  overviewGeneratedAt: string;
  overviewReason: string;
  pair: DashboardPair;
  timeframe: string;
}): Promise<PersistedSignalPairSummary> {
  const db = getRequiredDatabaseClient();
  const snapshotId = randomUUID();
  const mainOrderBlock = params.pair.mainOrderBlock;

  if (params.marketDataFeed && params.marketDataSnapshot) {
    await upsertMarketDataInputSnapshot({
      capturedAt: params.capturedAt,
      feed: params.marketDataFeed,
      snapshot: params.marketDataSnapshot,
      timeframe: params.timeframe,
    });
  }

  const [existingSnapshot] = await db
    .select({
      id: schema.marketSnapshots.id,
      rawPayload: schema.marketSnapshots.rawPayload,
    })
    .from(schema.marketSnapshots)
    .where(
      and(
        eq(schema.marketSnapshots.symbol, params.pair.symbol),
        eq(schema.marketSnapshots.timeframe, params.timeframe),
        eq(schema.marketSnapshots.capturedAt, params.capturedAt),
      ),
    )
    .limit(1);
  const existingRawPayload =
    existingSnapshot?.rawPayload &&
    typeof existingSnapshot.rawPayload === "object" &&
    !Array.isArray(existingSnapshot.rawPayload)
      ? existingSnapshot.rawPayload
      : {};
  const snapshotValues = {
    aggressiveFlowScore: params.pair.checklist.find(
      (item) => item.key === "aggressiveFlow",
    )?.matched
      ? "100.00"
      : "0.00",
    capturedAt: params.capturedAt,
    cvdBiasPct: toNumericString(params.pair.cvdBiasPct, 2),
    fundingRate: toNumericString(params.pair.fundingRate, 4),
    largeOrderScore: params.pair.checklist.find(
      (item) => item.key === "largeOrders",
    )?.matched
      ? "100.00"
      : "0.00",
    lastPrice: toNumericString(params.pair.lastPrice, 4),
    liquidationSweepScore: params.pair.checklist.find(
      (item) => item.key === "liquidationSweep",
    )?.matched
      ? "100.00"
      : "0.00",
    openInterestDeltaPct: toNumericString(params.pair.openInterestDeltaPct, 2),
    rawPayload: {
      ...existingRawPayload,
      executionConfig: DASHBOARD_EXECUTION_CONFIG,
      marketDataFeed:
        params.marketDataFeed ?? existingRawPayload.marketDataFeed ?? null,
      marketDataSnapshot:
        params.marketDataSnapshot ??
        existingRawPayload.marketDataSnapshot ??
        null,
      overviewGeneratedAt: params.overviewGeneratedAt,
      overviewReason: params.overviewReason,
      pair: params.pair,
    },
    symbol: params.pair.symbol,
    timeframe: params.timeframe,
  };

  if (existingSnapshot) {
    await db
      .update(schema.marketSnapshots)
      .set(snapshotValues)
      .where(eq(schema.marketSnapshots.id, existingSnapshot.id));
  } else {
    await db.insert(schema.marketSnapshots).values({
      id: snapshotId,
      ...snapshotValues,
    });
  }

  const snapshot = {
    id: existingSnapshot?.id ?? snapshotId,
  };

  if (!snapshot) {
    throw new Error(
      `Failed to upsert market snapshot for ${params.pair.symbol}.`,
    );
  }

  const [existingSignal] = await db
    .select({
      id: schema.tradingSignals.id,
    })
    .from(schema.tradingSignals)
    .where(eq(schema.tradingSignals.snapshotId, snapshot.id))
    .limit(1);
  const signalValues = {
    action: params.pair.action,
    checklist: params.pair.checklist.map((item) => ({
      key: item.key,
      label: item.label,
      matched: item.matched,
    })),
    confirmationCount: params.pair.confirmationCount,
    confirmationThreshold: params.pair.confirmationThreshold,
    createdAt: params.capturedAt,
    direction: params.pair.trendDirection,
    orderBlockHigh: toNumericString(mainOrderBlock.high, 4),
    orderBlockLow: toNumericString(mainOrderBlock.low, 4),
    rationale: params.pair.rationale,
    snapshotId: snapshot.id,
    stopLoss: toNumericString(params.pair.stopLoss, 4),
    symbol: params.pair.symbol,
    takeProfitOne: toNumericString(params.pair.takeProfitOne, 4),
    takeProfitTwo: toNumericString(params.pair.takeProfitTwo, 4),
    timeframe: params.timeframe,
  };

  if (existingSignal) {
    await db
      .update(schema.tradingSignals)
      .set(signalValues)
      .where(eq(schema.tradingSignals.id, existingSignal.id));

    return {
      action: params.pair.action,
      confirmationCount: params.pair.confirmationCount,
      signalId: existingSignal.id,
      snapshotId: snapshot.id,
      symbol: params.pair.symbol,
      updatedExistingSignal: true,
    };
  }

  const signalId = randomUUID();

  await db.insert(schema.tradingSignals).values({
    id: signalId,
    ...signalValues,
  });

  return {
    action: params.pair.action,
    confirmationCount: params.pair.confirmationCount,
    signalId,
    snapshotId: snapshot.id,
    symbol: params.pair.symbol,
    updatedExistingSignal: false,
  };
}

export async function runDashboardSignalCycle(): Promise<RunDashboardSignalCycleResult> {
  const marketDataResult = await loadDashboardMarketDataForSignalCycle();
  const overviewResult =
    await buildDashboardOverviewFromMarketData(marketDataResult);
  const timeframe = getSignalTimeframe();
  const cycleCapturedAt = getCycleCapturedAt(
    overviewResult.overview.generatedAt,
    timeframe,
  );
  const pairMarketDataBySymbol = new Map(
    marketDataResult.pairs.map((pairResult) => [
      pairResult.fallbackPair.symbol,
      pairResult,
    ]),
  );

  const accountSnapshotId = await upsertAccountSnapshot({
    capturedAt: cycleCapturedAt,
    overview: overviewResult.overview,
  });
  const pairs = await Promise.all(
    overviewResult.overview.pairs.map((pair) =>
      persistDashboardPairSignalSnapshot({
        capturedAt: cycleCapturedAt,
        marketDataFeed: pairMarketDataBySymbol.get(pair.symbol)?.feed ?? null,
        marketDataSnapshot:
          pairMarketDataBySymbol.get(pair.symbol)?.snapshot ?? null,
        overviewGeneratedAt: overviewResult.overview.generatedAt,
        overviewReason: overviewResult.reason,
        pair,
        timeframe,
      }),
    ),
  );

  logger.info("TrendX signal cycle persisted", {
    accountSnapshotId,
    cycleCapturedAt: cycleCapturedAt.toISOString(),
    pairs: pairs.map((pair) => ({
      action: pair.action,
      confirmationCount: pair.confirmationCount,
      symbol: pair.symbol,
      updatedExistingSignal: pair.updatedExistingSignal,
    })),
  });

  return {
    accountSnapshotId,
    cycleCapturedAt: cycleCapturedAt.toISOString(),
    pairs,
    reason: overviewResult.reason,
    success: true,
  };
}
