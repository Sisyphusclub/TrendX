import assert from "node:assert/strict";
import test from "node:test";

import type { DashboardOverviewFeed } from "@trendx/api";

import { getDashboardFeedState } from "./feed-state";

test("getDashboardFeedState derives fallback symbols and notes from feed metadata", () => {
  const feed: DashboardOverviewFeed = {
    accountRiskMode: "reference",
    accountRiskSource: "reference",
    marketDataMode: "mixed",
    marketDataSource: "mixed",
    notes: [
      "Local database market snapshots loaded for dashboard pairs.",
      "BTCUSDT local market snapshot is stale. Serving seeded fallback data.",
    ],
    pairs: [
      {
        capturedAt: null,
        mode: "fallback",
        note: "BTCUSDT local market snapshot is stale. Serving seeded fallback data.",
        source: "seeded",
        symbol: "BTCUSDT",
      },
      {
        capturedAt: "2026-04-13T08:00:00.000Z",
        mode: "live",
        note: "Local database market snapshots loaded for dashboard pairs.",
        source: "database",
        symbol: "ETHUSDT",
      },
    ],
  };

  const state = getDashboardFeedState(feed);

  assert.deepEqual(state.fallbackSymbols, ["BTCUSDT"]);
  assert.equal(state.hasFallbackPairs, true);
  assert.equal(state.hasLiveSignals, true);
  assert.equal(state.hasReferenceRisk, true);
  assert.equal(state.notes.length, 2);
});
