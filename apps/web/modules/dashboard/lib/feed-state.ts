import type { DashboardOverviewFeed, DashboardPair } from "@trendx/api";

import { localizeFeedReasonNote } from "./copy";

export interface DashboardFeedState {
  fallbackSymbols: DashboardPair["symbol"][];
  hasFallbackPairs: boolean;
  hasLiveSignals: boolean;
  hasReferenceRisk: boolean;
  notes: string[];
}

export function getDashboardFeedState(
  feed: DashboardOverviewFeed,
): DashboardFeedState {
  const fallbackSymbols = feed.pairs
    .filter((pair) => pair.mode === "fallback")
    .map((pair) => pair.symbol);

  return {
    fallbackSymbols,
    hasFallbackPairs: fallbackSymbols.length > 0,
    hasLiveSignals: feed.marketDataMode !== "fallback",
    hasReferenceRisk: feed.accountRiskMode === "reference",
    notes: feed.notes.map(localizeFeedReasonNote),
  };
}

export function getPairFeedMode(
  feedState: DashboardFeedState,
  symbol: DashboardPair["symbol"],
): "fallback" | "live" {
  return feedState.fallbackSymbols.includes(symbol) ? "fallback" : "live";
}
