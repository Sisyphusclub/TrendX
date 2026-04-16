import { createDatabaseClient, schema } from "@trendx/database";
import { and, desc, eq, inArray } from "@trendx/database/drizzle/operators";

import {
  getCycleCapturedAt,
  getSignalTimeframe,
} from "../packages/api/src/modules/dashboard/lib/run-signal-cycle";
import { loadWorkspaceEnv } from "./load-workspace-env";

const trackedSymbols = ["BTCUSDT", "ETHUSDT"] as const;
const activeExecutionPlanStatuses = [
  "PENDING",
  "ARMED",
  "OPEN",
  "PROTECTED",
  "HALTED",
] as const;

interface SymbolHealth {
  inputAgeMinutes: number | null;
  latestInputCapturedAt: string | null;
  latestInputProvider: string | null;
  latestSignalAction: string | null;
  latestSignalAgeMinutes: number | null;
  latestSignalCapturedAt: string | null;
  latestSnapshotAgeMinutes: number | null;
  latestSnapshotCapturedAt: string | null;
  latestSnapshotId: string | null;
  notes: string[];
  signalCycleAligned: boolean;
  status: "fail" | "ok" | "warn";
  symbol: (typeof trackedSymbols)[number];
}

function getIntervalDurationMs(timeframe: string): number {
  const match = timeframe
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

function getAgeMinutes(value: Date | null): number | null {
  if (!value) {
    return null;
  }

  return Math.round((Date.now() - value.getTime()) / (60 * 1000));
}

function getStatusRank(status: SymbolHealth["status"]): number {
  if (status === "fail") {
    return 2;
  }

  if (status === "warn") {
    return 1;
  }

  return 0;
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function countBy<TValue extends string>(
  values: TValue[],
): Record<TValue, number> {
  const counts = new Map<TValue, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Object.fromEntries(counts) as Record<TValue, number>;
}

loadWorkspaceEnv();

(async () => {
  const jsonMode = process.argv.includes("--json");
  const shouldRefresh = process.argv.includes("--refresh");
  const refreshStartedAt = shouldRefresh ? Date.now() : null;
  const timeframe = getSignalTimeframe();
  const intervalMs = getIntervalDurationMs(timeframe);
  const expectedCycleCapturedAt = getCycleCapturedAt(
    new Date().toISOString(),
    timeframe,
  );
  const staleBefore = new Date(
    expectedCycleCapturedAt.getTime() - intervalMs * 2,
  );
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for dashboard health checks.");
  }

  if (shouldRefresh) {
    const { runDashboardSignalCycle } = await import(
      "../packages/api/src/modules/dashboard/lib/run-signal-cycle"
    );

    await runDashboardSignalCycle();
  }
  const refreshDurationMs =
    refreshStartedAt === null ? null : Date.now() - refreshStartedAt;

  const db = createDatabaseClient(databaseUrl, {
    connectionTimeoutMs: Number(
      process.env.TRENDX_DATABASE_CONNECTION_TIMEOUT_MS ?? "5000",
    ),
  });

  const [latestAccountSnapshot, activeExecutionPlans, symbolHealth] =
    await Promise.all([
      db
        .select({
          capturedAt: schema.accountSnapshots.capturedAt,
          equity: schema.accountSnapshots.equity,
          openPositionCount: schema.accountSnapshots.openPositionCount,
        })
        .from(schema.accountSnapshots)
        .orderBy(desc(schema.accountSnapshots.capturedAt))
        .limit(1),
      db
        .select({
          id: schema.executionPlans.id,
          status: schema.executionPlans.status,
          symbol: schema.executionPlans.symbol,
          updatedAt: schema.executionPlans.updatedAt,
        })
        .from(schema.executionPlans)
        .where(
          inArray(schema.executionPlans.status, [
            ...activeExecutionPlanStatuses,
          ]),
        )
        .orderBy(desc(schema.executionPlans.updatedAt)),
      Promise.all(
        trackedSymbols.map(async (symbol): Promise<SymbolHealth> => {
          const [latestInput, latestSnapshot, latestSignal] = await Promise.all(
            [
              db
                .select({
                  capturedAt: schema.marketDataInputs.capturedAt,
                  providerSource: schema.marketDataInputs.providerSource,
                })
                .from(schema.marketDataInputs)
                .where(
                  and(
                    eq(schema.marketDataInputs.symbol, symbol),
                    eq(schema.marketDataInputs.timeframe, timeframe),
                  ),
                )
                .orderBy(desc(schema.marketDataInputs.capturedAt))
                .limit(1),
              db
                .select({
                  capturedAt: schema.marketSnapshots.capturedAt,
                  id: schema.marketSnapshots.id,
                })
                .from(schema.marketSnapshots)
                .where(
                  and(
                    eq(schema.marketSnapshots.symbol, symbol),
                    eq(schema.marketSnapshots.timeframe, timeframe),
                  ),
                )
                .orderBy(desc(schema.marketSnapshots.capturedAt))
                .limit(1),
              db
                .select({
                  action: schema.tradingSignals.action,
                  createdAt: schema.tradingSignals.createdAt,
                  snapshotId: schema.tradingSignals.snapshotId,
                })
                .from(schema.tradingSignals)
                .where(
                  and(
                    eq(schema.tradingSignals.symbol, symbol),
                    eq(schema.tradingSignals.timeframe, timeframe),
                  ),
                )
                .orderBy(desc(schema.tradingSignals.createdAt))
                .limit(1),
            ],
          );

          const input = latestInput[0];
          const snapshot = latestSnapshot[0];
          const signal = latestSignal[0];
          const notes: string[] = [];
          let status: SymbolHealth["status"] = "ok";

          if (!input) {
            notes.push("market_data_inputs missing");
            status = "fail";
          } else {
            if (input.capturedAt < staleBefore) {
              notes.push(
                `market_data_inputs stale (${getAgeMinutes(input.capturedAt)} min old)`,
              );
              status = "fail";
            }

            if (input.providerSource === "seeded") {
              notes.push("market_data_inputs provider is seeded");
              status = status === "fail" ? "fail" : "warn";
            }
          }

          if (!snapshot) {
            notes.push("market_snapshots missing");
            status = "fail";
          } else if (snapshot.capturedAt < staleBefore) {
            notes.push(
              `market_snapshots stale (${getAgeMinutes(snapshot.capturedAt)} min old)`,
            );
            status = "fail";
          }

          if (!signal) {
            notes.push("trading_signals missing");
            status = "fail";
          } else if (signal.createdAt < staleBefore) {
            notes.push(
              `trading_signals stale (${getAgeMinutes(signal.createdAt)} min old)`,
            );
            status = "fail";
          }

          const signalCycleAligned =
            signal?.createdAt !== undefined &&
            input?.capturedAt !== undefined &&
            signal.createdAt.getTime() === input.capturedAt.getTime();

          if (signal && snapshot && signal.snapshotId !== snapshot.id) {
            notes.push(
              "latest trading_signal is not linked to latest market_snapshot",
            );
            status = status === "fail" ? "fail" : "warn";
          }

          if (signal && input && !signalCycleAligned) {
            notes.push(
              "latest trading_signal cycle does not match latest market_data_input",
            );
            status = status === "fail" ? "fail" : "warn";
          }

          return {
            inputAgeMinutes: getAgeMinutes(input?.capturedAt ?? null),
            latestInputCapturedAt: toIsoString(input?.capturedAt ?? null),
            latestInputProvider: input?.providerSource ?? null,
            latestSignalAction: signal?.action ?? null,
            latestSignalAgeMinutes: getAgeMinutes(signal?.createdAt ?? null),
            latestSignalCapturedAt: toIsoString(signal?.createdAt ?? null),
            latestSnapshotAgeMinutes: getAgeMinutes(
              snapshot?.capturedAt ?? null,
            ),
            latestSnapshotCapturedAt: toIsoString(snapshot?.capturedAt ?? null),
            latestSnapshotId: snapshot?.id ?? null,
            notes,
            signalCycleAligned,
            status,
            symbol,
          };
        }),
      ),
    ]);

  const activePlanCount = activeExecutionPlans.length;
  const overallStatus =
    symbolHealth.reduce(
      (current, item) =>
        getStatusRank(item.status) > getStatusRank(current)
          ? item.status
          : current,
      "ok" as const,
    ) ?? "ok";
  const providerSummary = countBy(
    symbolHealth
      .map((item) => item.latestInputProvider)
      .filter((provider): provider is string => provider !== null),
  );
  const statusSummary = countBy(symbolHealth.map((item) => item.status));
  const latestInputAgeMinutes = symbolHealth
    .map((item) => item.inputAgeMinutes)
    .filter((value): value is number => value !== null);
  const latestSnapshotAgeMinutes = symbolHealth
    .map((item) => item.latestSnapshotAgeMinutes)
    .filter((value): value is number => value !== null);
  const latestSignalAgeMinutes = symbolHealth
    .map((item) => item.latestSignalAgeMinutes)
    .filter((value): value is number => value !== null);
  const output = {
    activeExecutionPlans: activeExecutionPlans.map((plan) => ({
      id: plan.id,
      status: plan.status,
      symbol: plan.symbol,
      updatedAt: plan.updatedAt.toISOString(),
    })),
    activePlanCount,
    expectedCycleCapturedAt: expectedCycleCapturedAt.toISOString(),
    latestAccountSnapshot:
      latestAccountSnapshot[0] === undefined
        ? null
        : {
            capturedAt: latestAccountSnapshot[0].capturedAt.toISOString(),
            equity: latestAccountSnapshot[0].equity,
            openPositionCount: latestAccountSnapshot[0].openPositionCount,
          },
    metrics: {
      latestInputAgeMinutes:
        latestInputAgeMinutes.length === 0
          ? null
          : Math.max(...latestInputAgeMinutes),
      latestSignalAgeMinutes:
        latestSignalAgeMinutes.length === 0
          ? null
          : Math.max(...latestSignalAgeMinutes),
      latestSnapshotAgeMinutes:
        latestSnapshotAgeMinutes.length === 0
          ? null
          : Math.max(...latestSnapshotAgeMinutes),
      providerSummary,
      refreshDurationMs,
      statusSummary,
    },
    overallStatus,
    refreshedBeforeCheck: shouldRefresh,
    staleThresholdBefore: staleBefore.toISOString(),
    symbolHealth,
    timeframe,
  };

  if (jsonMode) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`TrendX Health: ${overallStatus.toUpperCase()}`);
    console.log(`Timeframe: ${timeframe}`);
    console.log(`Expected Cycle: ${output.expectedCycleCapturedAt}`);
    console.log(`Stale Before: ${output.staleThresholdBefore}`);
    console.log(
      `Latest Account Snapshot: ${output.latestAccountSnapshot?.capturedAt ?? "missing"}`,
    );
    console.log(`Active Execution Plans: ${activePlanCount}`);
    console.log(
      `Provider Summary: ${JSON.stringify(output.metrics.providerSummary)}`,
    );
    console.log(
      `Status Summary: ${JSON.stringify(output.metrics.statusSummary)}`,
    );
    console.log(
      `Max Input Age (min): ${output.metrics.latestInputAgeMinutes ?? "n/a"}`,
    );
    console.log(
      `Max Signal Age (min): ${output.metrics.latestSignalAgeMinutes ?? "n/a"}`,
    );
    console.log(
      `Max Snapshot Age (min): ${output.metrics.latestSnapshotAgeMinutes ?? "n/a"}`,
    );

    if (output.metrics.refreshDurationMs !== null) {
      console.log(`Refresh Duration (ms): ${output.metrics.refreshDurationMs}`);
    }

    for (const item of symbolHealth) {
      console.log(`\n[${item.symbol}] ${item.status.toUpperCase()}`);
      console.log(`  input: ${item.latestInputCapturedAt ?? "missing"}`);
      console.log(`  provider: ${item.latestInputProvider ?? "missing"}`);
      console.log(`  inputAgeMinutes: ${item.inputAgeMinutes ?? "n/a"}`);
      console.log(`  snapshot: ${item.latestSnapshotCapturedAt ?? "missing"}`);
      console.log(
        `  snapshotAgeMinutes: ${item.latestSnapshotAgeMinutes ?? "n/a"}`,
      );
      console.log(
        `  signal: ${item.latestSignalCapturedAt ?? "missing"} (${item.latestSignalAction ?? "n/a"})`,
      );
      console.log(
        `  signalAgeMinutes: ${item.latestSignalAgeMinutes ?? "n/a"}`,
      );
      console.log(`  aligned: ${item.signalCycleAligned ? "yes" : "no"}`);

      if (item.notes.length > 0) {
        for (const note of item.notes) {
          console.log(`  - ${note}`);
        }
      }
    }
  }

  process.exitCode = overallStatus === "fail" ? 1 : 0;
})();
