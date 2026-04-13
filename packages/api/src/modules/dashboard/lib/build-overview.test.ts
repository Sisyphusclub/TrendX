import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardOverviewFromMarketData } from "./build-overview";
import type { DashboardMarketDataProviderResult } from "./market-data-provider";
import {
  buildSeededDashboardOverview,
  buildSeededDashboardPair,
} from "./seed-overview";

test("buildSeededDashboardOverview includes structured feed metadata", () => {
  const result = buildSeededDashboardOverview();

  assert.equal(result.feed.marketDataMode, "fallback");
  assert.equal(result.feed.marketDataSource, "seeded");
  assert.equal(result.feed.accountRiskMode, "reference");
  assert.equal(result.feed.pairs.length, 2);
  assert.deepEqual(
    result.feed.pairs.map((pair) => pair.symbol),
    ["BTCUSDT", "ETHUSDT"],
  );
});

test("buildDashboardOverviewFromMarketData preserves fallback feed state", async () => {
  const note = "Coinank API key missing. Serving seeded dashboard overview.";
  const marketDataResult: DashboardMarketDataProviderResult = {
    killSwitchEnabled: false,
    mode: "fallback",
    notes: [note],
    pairs: [
      {
        fallbackPair: buildSeededDashboardPair("BTCUSDT"),
        feed: {
          capturedAt: null,
          mode: "fallback",
          note,
          source: "seeded",
          symbol: "BTCUSDT",
        },
        snapshot: null,
      },
      {
        fallbackPair: buildSeededDashboardPair("ETHUSDT"),
        feed: {
          capturedAt: null,
          mode: "fallback",
          note,
          source: "seeded",
          symbol: "ETHUSDT",
        },
        snapshot: null,
      },
    ],
    source: "seeded",
  };

  delete process.env.TRENDX_BINANCE_API_KEY;
  delete process.env.TRENDX_BINANCE_API_SECRET;

  const result = await buildDashboardOverviewFromMarketData(marketDataResult);

  assert.equal(result.success, true);
  assert.equal(result.feed.marketDataMode, "fallback");
  assert.equal(result.feed.marketDataSource, "seeded");
  assert.equal(result.feed.accountRiskMode, "reference");
  assert.equal(result.overview.pairs.length, 2);
  assert.match(result.reason, /Coinank API key missing/);
  assert.match(
    result.reason,
    /Account risk remains reference-only until Binance execution is integrated/,
  );
});
