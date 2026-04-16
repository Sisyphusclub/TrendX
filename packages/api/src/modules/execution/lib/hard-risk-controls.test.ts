import assert from "node:assert/strict";
import test from "node:test";

import { buildSeededDashboardOverview } from "../../dashboard/lib/seed-overview";
import { getHardRiskBlockReason } from "./hard-risk-controls";

test("getHardRiskBlockReason blocks execution when pair feed is not from current cycle", async () => {
  const overviewResult = buildSeededDashboardOverview();
  const pair = overviewResult.overview.pairs[0];

  if (!pair) {
    throw new Error("Seeded overview did not return BTCUSDT.");
  }

  overviewResult.overview.generatedAt = "2026-04-15T09:05:00.000Z";

  const feedPair = overviewResult.feed.pairs.find(
    (candidate) => candidate.symbol === pair.symbol,
  );

  if (!feedPair) {
    throw new Error(`Seeded feed is missing ${pair.symbol}.`);
  }

  feedPair.capturedAt = "2026-04-15T07:00:00.000Z";
  feedPair.mode = "live";
  feedPair.source = "database";
  const stage =
    pair.entryStages[0] ?? pair.entryStages[1] ?? pair.entryStages[2];

  if (!stage) {
    throw new Error(`Seeded pair is missing entry stages for ${pair.symbol}.`);
  }

  const reason = await getHardRiskBlockReason({
    overviewResult,
    pair,
    stage,
  });

  assert.equal(
    reason,
    "硬风控拦截：当前交易对快照不是本小时最新周期，禁止执行。",
  );
});
