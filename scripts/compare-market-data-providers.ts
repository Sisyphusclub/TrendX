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

  const coinankMarketData = await loadDashboardMarketData({
    provider: "coinank",
  });
  const localDbMarketData = await loadDashboardMarketData({
    provider: "local-db",
  });
  const coinankOverview =
    await buildDashboardOverviewFromMarketData(coinankMarketData);
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

  const pairComparisons = coinankOverview.overview.pairs.map((coinankPair) => {
    const localDbPair = localDbOverview.overview.pairs.find(
      (pair) => pair.symbol === coinankPair.symbol,
    );

    if (!localDbPair) {
      return {
        missingLocalDbPair: true,
        symbol: coinankPair.symbol,
      };
    }

    return comparePairMetrics(coinankPair, localDbPair);
  });

  console.log(
    JSON.stringify(
      {
        coinankFeed: coinankOverview.feed,
        localDbSnapshotMeta: Array.from(latestLocalSnapshotBySymbol.values()),
        localDbFeed: localDbOverview.feed,
        pairComparisons,
        refreshedBeforeCompare: shouldRefresh,
      },
      null,
      2,
    ),
  );
})();
