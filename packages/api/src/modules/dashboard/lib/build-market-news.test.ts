import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardMarketNews } from "./build-market-news";

test("buildDashboardMarketNews defaults to local seeded provider", async () => {
  delete process.env.TRENDX_MARKET_NEWS_PROVIDER;

  const result = await buildDashboardMarketNews();

  assert.equal(result.success, true);
  assert.equal(result.reason, "Local seeded market news loaded.");
  assert.equal(result.marketNews.mode, "fallback");
  assert.equal(result.marketNews.flashes.length > 0, true);
  assert.equal(result.marketNews.headlines.length > 0, true);
});
