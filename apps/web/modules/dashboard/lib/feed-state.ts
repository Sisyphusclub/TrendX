import type { DashboardOverviewFeed, DashboardPair } from "@trendx/api";

import { localizeFeedReasonNote } from "./copy";

export interface DashboardFeedState {
  fallbackSymbols: DashboardPair["symbol"][];
  hasFallbackPairs: boolean;
  hasLiveSignals: boolean;
  hasReferenceRisk: boolean;
  latestCapturedAt: string | null;
  notes: string[];
  pairFeeds: DashboardOverviewFeed["pairs"];
}

export function getDashboardFeedState(
  feed: DashboardOverviewFeed,
): DashboardFeedState {
  const fallbackSymbols = feed.pairs
    .filter((pair) => pair.mode === "fallback")
    .map((pair) => pair.symbol);

  const latestCapturedAt =
    feed.pairs
      .map((pair) => pair.capturedAt)
      .filter((capturedAt): capturedAt is string => capturedAt !== null)
      .sort((left, right) => right.localeCompare(left))[0] ?? null;

  return {
    fallbackSymbols,
    hasFallbackPairs: fallbackSymbols.length > 0,
    hasLiveSignals: feed.marketDataMode !== "fallback",
    hasReferenceRisk: feed.accountRiskMode === "reference",
    latestCapturedAt,
    notes: feed.notes.map(localizeFeedReasonNote),
    pairFeeds: feed.pairs,
  };
}

export function getPairFeed(
  feedState: DashboardFeedState,
  symbol: DashboardPair["symbol"],
): DashboardOverviewFeed["pairs"][number] | null {
  return feedState.pairFeeds.find((pair) => pair.symbol === symbol) ?? null;
}

export function getPairFeedMode(
  feedState: DashboardFeedState,
  symbol: DashboardPair["symbol"],
): "fallback" | "live" {
  return getPairFeed(feedState, symbol)?.mode ?? "fallback";
}

export function getPairFeedCapturedAt(
  feedState: DashboardFeedState,
  symbol: DashboardPair["symbol"],
): string | null {
  return getPairFeed(feedState, symbol)?.capturedAt ?? null;
}
