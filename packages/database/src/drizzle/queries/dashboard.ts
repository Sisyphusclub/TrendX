import { createDatabaseClient } from "../../client";
import { and, desc, eq } from "../operators";
import { accountSnapshots, marketDataInputs, tradingSignals } from "../schema";

export interface LatestAccountSnapshotRecord {
  availableMargin: number;
  capturedAt: string;
  equity: number;
  exposurePct: number;
  openPositionCount: number;
  realizedPnl: number;
  unrealizedPnl: number;
  usedMargin: number;
}

export interface LatestSignalRecord {
  action: "ENTRY" | "EXIT" | "WAIT";
  createdAt: string;
  confirmationCount: number;
  timeframe: string;
  symbol: "BTCUSDT" | "ETHUSDT";
  trendDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
}

function toNumber(value: string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

let databaseClient: ReturnType<typeof createDatabaseClient> | null | undefined;

function getQueryDatabaseClient(): ReturnType<
  typeof createDatabaseClient
> | null {
  if (databaseClient !== undefined) {
    return databaseClient;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    databaseClient = null;

    return null;
  }

  databaseClient = createDatabaseClient(databaseUrl);

  return databaseClient;
}

export async function getLatestAccountSnapshot(): Promise<LatestAccountSnapshotRecord | null> {
  const db = getQueryDatabaseClient();

  if (!db) {
    return null;
  }

  const [snapshot] = await db
    .select({
      availableMargin: accountSnapshots.availableMargin,
      capturedAt: accountSnapshots.capturedAt,
      equity: accountSnapshots.equity,
      exposurePct: accountSnapshots.exposurePct,
      openPositionCount: accountSnapshots.openPositionCount,
      realizedPnl: accountSnapshots.realizedPnl,
      unrealizedPnl: accountSnapshots.unrealizedPnl,
      usedMargin: accountSnapshots.usedMargin,
    })
    .from(accountSnapshots)
    .orderBy(desc(accountSnapshots.capturedAt))
    .limit(1);

  if (!snapshot) {
    return null;
  }

  return {
    availableMargin: toNumber(snapshot.availableMargin),
    capturedAt: snapshot.capturedAt.toISOString(),
    equity: toNumber(snapshot.equity),
    exposurePct: toNumber(snapshot.exposurePct),
    openPositionCount: snapshot.openPositionCount,
    realizedPnl: toNumber(snapshot.realizedPnl),
    unrealizedPnl: toNumber(snapshot.unrealizedPnl),
    usedMargin: toNumber(snapshot.usedMargin),
  };
}

export async function listLatestSignalRecords(): Promise<LatestSignalRecord[]> {
  const db = getQueryDatabaseClient();

  if (!db) {
    return [];
  }

  const latestInputs = await db
    .select({
      capturedAt: marketDataInputs.capturedAt,
      symbol: marketDataInputs.symbol,
      timeframe: marketDataInputs.timeframe,
    })
    .from(marketDataInputs)
    .orderBy(desc(marketDataInputs.capturedAt));
  const latestInputBySymbol = new Map<string, (typeof latestInputs)[number]>();

  for (const input of latestInputs) {
    if (!latestInputBySymbol.has(input.symbol)) {
      latestInputBySymbol.set(input.symbol, input);
    }
  }

  const records: LatestSignalRecord[] = [];

  for (const symbol of ["BTCUSDT", "ETHUSDT"] as const) {
    const latestInput = latestInputBySymbol.get(symbol);

    if (!latestInput) {
      continue;
    }

    const [signal] = await db
      .select({
        action: tradingSignals.action,
        confirmationCount: tradingSignals.confirmationCount,
        createdAt: tradingSignals.createdAt,
        direction: tradingSignals.direction,
        timeframe: tradingSignals.timeframe,
      })
      .from(tradingSignals)
      .where(
        and(
          eq(tradingSignals.createdAt, latestInput.capturedAt),
          eq(tradingSignals.symbol, symbol),
          eq(tradingSignals.timeframe, latestInput.timeframe),
        ),
      )
      .orderBy(desc(tradingSignals.createdAt))
      .limit(1);

    if (!signal) {
      continue;
    }

    records.push({
      action: signal.action,
      confirmationCount: signal.confirmationCount,
      createdAt: signal.createdAt.toISOString(),
      symbol,
      timeframe: signal.timeframe,
      trendDirection: signal.direction,
    });
  }

  return records;
}
