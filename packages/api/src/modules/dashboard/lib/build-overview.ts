import { logger } from "@trendx/logs";

import {
  type BinanceDashboardAccountState,
  fetchBinanceDashboardAccountState,
  getBinanceFuturesConfig,
} from "../../exchange/lib/binance-client";
import { DASHBOARD_EXECUTION_CONFIG } from "../config";
import type { DashboardPair, GetDashboardOverviewOutput } from "../types";
import { getDashboardOverviewOutputSchema } from "../types";
import {
  type DashboardMarketDataProviderResult,
  loadDashboardMarketData,
} from "./market-data-provider";
import { buildLiveDashboardPair } from "./signal-engine";

const DEFAULT_REFERENCE_EQUITY = 100_000;
const EXECUTION_LEVERAGE = DASHBOARD_EXECUTION_CONFIG.leverage;

function buildReferenceAccountRisk() {
  return {
    availableMargin: DEFAULT_REFERENCE_EQUITY,
    dailyPnl: 0,
    equity: DEFAULT_REFERENCE_EQUITY,
    exposurePct: 0,
    openPositionCount: 0,
    usedMargin: 0,
  };
}

function applyExchangePositionToPair(
  pair: DashboardPair,
  accountState: BinanceDashboardAccountState | null,
): DashboardPair {
  if (!accountState) {
    return pair;
  }

  const exchangePosition = accountState.positionsBySymbol[pair.symbol];

  if (!exchangePosition) {
    return {
      ...pair,
      currentPosition: {
        leverage: EXECUTION_LEVERAGE,
        pnl: 0,
        side: "FLAT",
        sizeUsd: 0,
      },
    };
  }

  return {
    ...pair,
    currentPosition: {
      leverage: EXECUTION_LEVERAGE,
      pnl: exchangePosition.pnl,
      side: exchangePosition.side,
      sizeUsd: exchangePosition.sizeUsd,
    },
    executionStatus:
      exchangePosition.side === "FLAT" ? pair.executionStatus : "OPEN",
  };
}

function resolveOverviewGeneratedAt(
  marketDataResult: DashboardMarketDataProviderResult,
): string {
  const latestCapturedAt =
    marketDataResult.pairs
      .map((pair) => pair.feed.capturedAt)
      .filter((capturedAt): capturedAt is string => capturedAt !== null)
      .sort((left, right) => right.localeCompare(left))[0] ?? null;

  return latestCapturedAt ?? new Date().toISOString();
}

export async function buildDashboardOverviewFromMarketData(
  marketDataResult: DashboardMarketDataProviderResult,
): Promise<GetDashboardOverviewOutput> {
  const binanceConfig = getBinanceFuturesConfig();
  const accountStateResult = binanceConfig
    ? await Promise.allSettled([
        fetchBinanceDashboardAccountState(binanceConfig),
      ])
    : null;
  const accountState =
    accountStateResult?.[0]?.status === "fulfilled"
      ? accountStateResult[0].value
      : null;
  const reasons: string[] = [];
  const generatedAt = resolveOverviewGeneratedAt(marketDataResult);
  const [marketSummaryNote, ...marketFallbackNotes] = marketDataResult.notes;

  if (marketSummaryNote) {
    reasons.push(marketSummaryNote);
  }

  if (accountStateResult?.[0]?.status === "rejected") {
    logger.warn(
      "Binance account sync failed; falling back to reference risk.",
      {
        error:
          accountStateResult[0].reason instanceof Error
            ? accountStateResult[0].reason.message
            : String(accountStateResult[0].reason),
        mode: binanceConfig?.mode ?? "unknown",
      },
    );
    reasons.push(
      "Binance account sync failed; account risk remains reference-only.",
    );
  }

  if (!accountState) {
    reasons.push(
      "Account risk remains reference-only until Binance execution is integrated.",
    );
  } else {
    reasons.push(accountState.reason);
  }

  reasons.push(...marketFallbackNotes);

  const pairs = marketDataResult.pairs.map((pairResult) =>
    pairResult.snapshot === null
      ? pairResult.fallbackPair
      : buildLiveDashboardPair(pairResult.snapshot),
  );

  return getDashboardOverviewOutputSchema.parse({
    feed: {
      accountRiskMode: accountState === null ? "reference" : "live",
      accountRiskSource: accountState === null ? "reference" : "binance",
      marketDataMode: marketDataResult.mode,
      marketDataSource: marketDataResult.source,
      notes: reasons,
      pairs: marketDataResult.pairs.map((pairResult) => pairResult.feed),
    },
    overview: {
      accountRisk: accountState?.accountRisk ?? buildReferenceAccountRisk(),
      cadenceMinutes: 60,
      executionConfig: DASHBOARD_EXECUTION_CONFIG,
      generatedAt,
      killSwitchEnabled: marketDataResult.killSwitchEnabled,
      operatorMode: "AUTOMATED",
      pairs: pairs.map((pair) =>
        applyExchangePositionToPair(pair, accountState),
      ),
    },
    reason: reasons.join(" "),
    success: true,
  });
}

export async function buildDashboardOverview(): Promise<GetDashboardOverviewOutput> {
  return await buildDashboardOverviewFromMarketData(
    await loadDashboardMarketData(),
  );
}
