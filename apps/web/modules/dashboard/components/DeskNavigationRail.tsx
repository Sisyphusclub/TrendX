import type { DashboardOverview, DashboardPair } from "@trendx/api";
import {
  Bot,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Shield,
  Sparkles,
} from "lucide-react";
import type { ReactElement } from "react";

import type { DashboardFeedState } from "../lib/feed-state";
import { getPairFeedMode } from "../lib/feed-state";
import {
  formatCheckSummary,
  formatExecutionStatus,
  formatFeedMode,
  formatSignalLabel,
  formatTrendDirection,
} from "../lib/formatters";
import {
  type DashboardSection,
  dashboardSectionItems,
} from "../lib/view-config";

interface DeskNavigationRailProps {
  activeSection: DashboardSection;
  activeSignalSymbol: DashboardPair["symbol"];
  feedState: DashboardFeedState;
  onSectionChange: (section: DashboardSection) => void;
  onSignalPairSelect: (symbol: DashboardPair["symbol"]) => void;
  overview: DashboardOverview;
}

const sectionIcons = {
  controls: Sparkles,
  journal: Bot,
  overview: BriefcaseBusiness,
  risk: Shield,
  signals: ChartNoAxesCombined,
} satisfies Record<DashboardSection, typeof BriefcaseBusiness>;

export function DeskNavigationRail({
  activeSection,
  activeSignalSymbol,
  feedState,
  onSectionChange,
  onSignalPairSelect,
  overview,
}: DeskNavigationRailProps): ReactElement {
  const activeExposure = overview.pairs.filter(
    (pair) => pair.currentPosition.side !== "FLAT",
  ).length;
  const hasLiveExecution = !feedState.hasReferenceRisk;

  return (
    <aside className="desk-rail-shell flex h-full min-h-0 flex-col gap-3 rounded-[26px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
      <div className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
        <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
          TrendX
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-2xl font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
            交易台
          </p>
          <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
            1H
          </span>
        </div>
        <p className="mt-2 text-xs text-[color:var(--color-muted)]">
          BTC / ETH · 顺势自动
        </p>
      </div>

      <nav className="grid gap-2">
        {dashboardSectionItems.map((item) => {
          const Icon = sectionIcons[item.key];
          const isActive = item.key === activeSection;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSectionChange(item.key)}
              className={
                isActive
                  ? "group flex items-center gap-3 rounded-[18px] border border-[color:var(--color-blue)]/18 bg-[color:var(--color-blue-fog)] px-4 py-3 text-left text-[color:var(--color-blue)]"
                  : "group flex items-center gap-3 rounded-[18px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-left text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:border-[color:var(--color-line-strong)]"
              }
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-current/10 bg-[color:var(--color-surface-soft)]">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
        <p className="mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
          运行状态
        </p>
        <div className="mt-3 grid gap-2 text-sm text-[color:var(--color-ink-soft)]">
          <div className="flex items-center justify-between gap-3">
            <span>执行</span>
            <span
              className={
                overview.killSwitchEnabled
                  ? "rounded-full border border-[color:var(--color-bear)]/18 bg-[color:var(--color-bear-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-bear)]"
                  : "rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-ink)]"
              }
            >
              {overview.killSwitchEnabled ? "已锁定" : "可用"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>敞口</span>
            <span className="font-semibold text-[color:var(--color-ink)]">
              {activeExposure}/2
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>风控</span>
            <span className="font-semibold text-[color:var(--color-ink)]">
              {hasLiveExecution ? "联动" : "参考"}
            </span>
          </div>
        </div>
      </div>

      <div className="min-h-0 rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
        <p className="mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
          监控交易对
        </p>
        <div className="mt-3 grid gap-2">
          {overview.pairs.map((pair) => {
            const feedMode = getPairFeedMode(feedState, pair.symbol);
            const isActive = activeSignalSymbol === pair.symbol;

            return (
              <button
                key={pair.symbol}
                type="button"
                onClick={() => onSignalPairSelect(pair.symbol)}
                className={
                  isActive
                    ? "rounded-[18px] border border-[color:var(--color-blue)]/18 bg-[color:var(--color-blue-fog)] px-3 py-3 text-left"
                    : "rounded-[18px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-3 py-3 text-left transition duration-200 ease-out hover:border-[color:var(--color-line-strong)]"
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                    {pair.symbol}
                  </p>
                  <span className="text-xs font-medium text-[color:var(--color-ink-soft)]">
                    {formatSignalLabel(pair.action)}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-[color:var(--color-ink-soft)]">
                  <p>
                    {formatTrendDirection(pair.trendDirection)} ·{" "}
                    {formatCheckSummary(
                      pair.confirmationCount,
                      pair.checklist.length,
                      pair.confirmationThreshold,
                    )}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span>{formatExecutionStatus(pair.executionStatus)}</span>
                    <span className="text-[color:var(--color-line-strong)]">
                      ·
                    </span>
                    <span
                      className={
                        feedMode === "fallback"
                          ? "font-semibold text-[color:var(--color-wait)]"
                          : "font-semibold text-[color:var(--color-blue)]"
                      }
                    >
                      {formatFeedMode(feedMode)}
                    </span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
