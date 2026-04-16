import { loadWorkspaceEnv } from "./load-workspace-env";

function getRoundedDiff(left: number, right: number): number {
  return Number((left - right).toFixed(6));
}

function comparePairMetrics(
  left: {
    action: string;
    confirmationCount: number;
    cvdBiasPct: number;
    fundingRate: number;
    openInterestDeltaPct: number;
    stopLoss: number;
    symbol: string;
    takeProfitOne: number;
    takeProfitTwo: number;
    trendDirection: string;
  },
  right: {
    action: string;
    confirmationCount: number;
    cvdBiasPct: number;
    fundingRate: number;
    openInterestDeltaPct: number;
    stopLoss: number;
    symbol: string;
    takeProfitOne: number;
    takeProfitTwo: number;
    trendDirection: string;
  },
) {
  return {
    actionMatches: left.action === right.action,
    confirmationCountDiff: left.confirmationCount - right.confirmationCount,
    cvdBiasPctDiff: getRoundedDiff(left.cvdBiasPct, right.cvdBiasPct),
    fundingRateDiff: getRoundedDiff(left.fundingRate, right.fundingRate),
    openInterestDeltaPctDiff: getRoundedDiff(
      left.openInterestDeltaPct,
      right.openInterestDeltaPct,
    ),
    stopLossDiff: getRoundedDiff(left.stopLoss, right.stopLoss),
    symbol: left.symbol,
    takeProfitOneDiff: getRoundedDiff(left.takeProfitOne, right.takeProfitOne),
    takeProfitTwoDiff: getRoundedDiff(left.takeProfitTwo, right.takeProfitTwo),
    trendDirectionMatches: left.trendDirection === right.trendDirection,
  };
}

loadWorkspaceEnv();

(async () => {
  const shouldRefresh = process.argv.includes("--refresh");
  const providerArg = process.argv.find((arg) => arg.startsWith("--provider="));
  const sourceProvider =
    providerArg?.split("=")[1] ??
    process.env.TRENDX_SIGNAL_CYCLE_MARKET_DATA_PROVIDER ??
    "okx-public";
  const { buildDashboardOverviewFromMarketData } = await import(
    "../packages/api/src/modules/dashboard/lib/build-overview.ts"
  );
  const { loadDashboardMarketData } = await import(
    "../packages/api/src/modules/dashboard/lib/market-data-provider.ts"
  );
  const { createDatabaseClient, schema } = await import("@trendx/database");
  const { desc } = await import("@trendx/database/drizzle/operators");

  if (shouldRefresh) {
    const { runDashboardSignalCycle } = await import(
      "../packages/api/src/modules/dashboard/lib/run-signal-cycle.ts"
    );

    await runDashboardSignalCycle();
  }

  const sourceMarketData = await loadDashboardMarketData({
    provider: sourceProvider,
  });
  const localDbMarketData = await loadDashboardMarketData({
    provider: "local-db",
  });
  const sourceOverview =
    await buildDashboardOverviewFromMarketData(sourceMarketData);
  const localDbOverview =
    await buildDashboardOverviewFromMarketData(localDbMarketData);
  const db = createDatabaseClient(
    process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/trendx",
  );
  const localSnapshotRows = await db
    .select({
      capturedAt: schema.marketDataInputs.capturedAt,
      providerSource: schema.marketDataInputs.providerSource,
      symbol: schema.marketDataInputs.symbol,
      timeframe: schema.marketDataInputs.timeframe,
    })
    .from(schema.marketDataInputs)
    .orderBy(desc(schema.marketDataInputs.capturedAt));
  const latestLocalSnapshotBySymbol = new Map<
    string,
    (typeof localSnapshotRows)[number]
  >();

  for (const row of localSnapshotRows) {
    if (!latestLocalSnapshotBySymbol.has(row.symbol)) {
      latestLocalSnapshotBySymbol.set(row.symbol, row);
    }
  }

  const pairComparisons = sourceOverview.overview.pairs.map((sourcePair) => {
    const localDbPair = localDbOverview.overview.pairs.find(
      (pair) => pair.symbol === sourcePair.symbol,
    );

    if (!localDbPair) {
      return {
        missingLocalDbPair: true,
        symbol: sourcePair.symbol,
      };
    }

    return comparePairMetrics(sourcePair, localDbPair);
  });

  console.log(
    JSON.stringify(
      {
        localDbFeed: localDbOverview.feed,
        localDbSnapshotMeta: Array.from(latestLocalSnapshotBySymbol.values()),
        pairComparisons,
        refreshedBeforeCompare: shouldRefresh,
        sourceFeed: sourceOverview.feed,
        sourceProvider,
      },
      null,
      2,
    ),
  );
})();
