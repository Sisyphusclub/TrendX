import type { DashboardPair } from "@trendx/api";

import { localizeFeedReasonNote } from "./copy";

const trackedSymbols = ["BTCUSDT", "ETHUSDT"] as const;
const pairFallbackPattern =
  /([A-Z]+USDT) is using seeded fallback data after a Coinank fetch failure\./g;

export interface DashboardFeedState {
  fallbackSymbols: DashboardPair["symbol"][];
  hasFallbackPairs: boolean;
  hasLiveSignals: boolean;
  hasReferenceRisk: boolean;
  notes: string[];
}

function isTrackedSymbol(
  value: string | undefined,
): value is DashboardPair["symbol"] {
  if (value === undefined) {
    return false;
  }

  return trackedSymbols.includes(value as DashboardPair["symbol"]);
}

function normalizeReasonNotes(reason: string): string[] {
  return reason
    .split(". ")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => (segment.endsWith(".") ? segment : `${segment}.`))
    .map(localizeFeedReasonNote);
}

export function getDashboardFeedState(reason: string): DashboardFeedState {
  const fallbackSymbols = Array.from(reason.matchAll(pairFallbackPattern))
    .map((match) => match[1])
    .filter(isTrackedSymbol);

  return {
    fallbackSymbols,
    hasFallbackPairs: fallbackSymbols.length > 0,
    hasLiveSignals: reason.includes(
      "Coinank live market data loaded for dashboard pairs.",
    ),
    hasReferenceRisk: reason.includes(
      "Account risk remains reference-only until Binance execution is integrated.",
    ),
    notes: normalizeReasonNotes(reason),
  };
}

export function getPairFeedMode(
  feedState: DashboardFeedState,
  symbol: DashboardPair["symbol"],
): "fallback" | "live" {
  return feedState.fallbackSymbols.includes(symbol) ? "fallback" : "live";
}
