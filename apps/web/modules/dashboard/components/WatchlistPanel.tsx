import type { DashboardOverview } from "@trendx/api";
import { ArrowDownRight, ArrowUpRight, CircleDashed } from "lucide-react";
import type { ReactElement } from "react";

import { Panel } from "@/modules/shared/components/Panel";

import type { DashboardFeedState } from "../lib/feed-state";
import { getPairFeedMode } from "../lib/feed-state";
import {
  formatCheckSummary,
  formatExecutionStatus,
  formatFeedMode,
  formatPct,
  formatSignalLabel,
  formatTrendDirection,
  formatUsd,
} from "../lib/formatters";

interface WatchlistPanelProps {
  feedState: DashboardFeedState;
  overview: DashboardOverview;
}

export function WatchlistPanel({
  feedState,
  overview,
}: WatchlistPanelProps): ReactElement {
  return (
    <Panel eyebrow="交易对监控" title="BTC / ETH 监控矩阵">
      <div className="overflow-hidden rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div className="hidden grid-cols-[1.05fr_0.85fr_0.95fr_1.1fr_0.95fr] gap-3 border-b border-[color:var(--color-line)] px-4 py-3 md:grid">
          {["交易对", "方向", "数据源", "触发", "标记价 / OI"].map((label) => (
            <p
              key={label}
              className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]"
            >
              {label}
            </p>
          ))}
        </div>

        {overview.pairs.map((pair, index) => {
          const directionIcon =
            pair.trendDirection === "BULLISH" ? (
              <ArrowUpRight className="size-4" />
            ) : pair.trendDirection === "BEARISH" ? (
              <ArrowDownRight className="size-4" />
            ) : (
              <CircleDashed className="size-4" />
            );

          return (
            <div
              key={pair.symbol}
              className={
                index === 0
                  ? "grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1.05fr_0.85fr_0.95fr_1.1fr_0.95fr] md:items-center"
                  : "grid grid-cols-1 gap-3 border-t border-[color:var(--color-line)] px-4 py-4 md:grid-cols-[1.05fr_0.85fr_0.95fr_1.1fr_0.95fr] md:items-center"
              }
            >
              <div>
                <p className="text-base font-semibold text-[color:var(--color-ink)]">
                  {pair.symbol}
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                  {formatExecutionStatus(pair.executionStatus)}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink-soft)]">
                <span className="flex size-8 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] text-[color:var(--color-blue)]">
                  {directionIcon}
                </span>
                <span>{formatTrendDirection(pair.trendDirection)}</span>
              </div>

              <div>
                {(() => {
                  const feedMode = getPairFeedMode(feedState, pair.symbol);

                  return (
                    <span
                      className={
                        feedMode === "fallback"
                          ? "inline-flex rounded-full border border-[color:var(--color-wait)]/20 bg-[color:var(--color-wait-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-wait)]"
                          : "inline-flex rounded-full border border-[color:var(--color-blue)]/16 bg-[color:var(--color-blue-fog)] px-3 py-1 text-xs font-semibold text-[color:var(--color-blue)]"
                      }
                    >
                      {formatFeedMode(feedMode)}
                    </span>
                  );
                })()}
              </div>

              <div>
                <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                  {formatSignalLabel(pair.action)}
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                  {formatCheckSummary(
                    pair.confirmationCount,
                    pair.checklist.length,
                    pair.confirmationThreshold,
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                  {formatUsd(pair.markPrice)}
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                  OI {formatPct(pair.openInterestDeltaPct)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
