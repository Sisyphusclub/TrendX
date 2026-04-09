import type { DashboardOverview, DashboardPair } from "@trendx/api";
import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  History,
  Newspaper,
  Settings2,
} from "lucide-react";
import type { ReactElement } from "react";

import type { DashboardFeedState } from "../lib/feed-state";
import { getPairFeedMode } from "../lib/feed-state";
import {
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
  controls: Settings2,
  journal: History,
  overview: BriefcaseBusiness,
  risk: Newspaper,
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
  const activeEntryCount = overview.pairs.filter(
    (pair) => pair.action === "ENTRY",
  ).length;

  return (
    <aside className="desk-rail-shell flex h-full min-h-0 flex-col gap-3 rounded-[28px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
      <div className="hero-shell rounded-[24px] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-blue)]">
              TrendX
            </p>
            <p className="mt-3 text-[1.55rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
              主控台
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              BTC / ETH · 1H 顺势执行
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--color-line)] bg-white/72 px-3 py-1 text-[11px] font-semibold text-[color:var(--color-blue)]">
            1H
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[18px] border border-[color:var(--color-line)] bg-white/68 px-3 py-3">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-blue)]">
              活跃信号
            </p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
              {activeEntryCount}
            </p>
          </div>
          <div className="rounded-[18px] border border-[color:var(--color-line)] bg-white/68 px-3 py-3">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-blue)]">
              风控模式
            </p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--color-ink)]">
              {feedState.hasReferenceRisk ? "参考" : "联动"}
            </p>
          </div>
        </div>
      </div>

      <nav className="grid gap-1.5">
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
                  ? "group flex items-center gap-3 rounded-[18px] border border-[color:var(--color-blue)]/12 bg-[color:var(--color-surface-blue)] px-3.5 py-3 text-left text-[color:var(--color-blue)]"
                  : "group flex items-center gap-3 rounded-[18px] border border-transparent bg-transparent px-3.5 py-3 text-left text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:border-[color:var(--color-line)] hover:bg-[color:var(--color-surface-soft)]"
              }
            >
              <span
                className={
                  isActive
                    ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-blue)] text-white"
                    : "flex size-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-soft)]"
                }
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-blue)]">
            监控交易对
          </p>
          <span className="rounded-full border border-[color:var(--color-line)] bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-ink-soft)]">
            {overview.pairs.length} 个
          </span>
        </div>

        <div className="mt-3 grid min-h-0 gap-2 overflow-y-auto">
          {overview.pairs.map((pair) => {
            const feedMode = getPairFeedMode(feedState, pair.symbol);
            const isActive = activeSignalSymbol === pair.symbol;
            const signalToneClass =
              pair.action === "ENTRY"
                ? "bg-[color:var(--color-profit)]"
                : pair.action === "EXIT"
                  ? "bg-[color:var(--color-loss)]"
                  : "bg-[color:var(--color-wait)]";

            return (
              <button
                key={pair.symbol}
                type="button"
                onClick={() => onSignalPairSelect(pair.symbol)}
                className={
                  isActive
                    ? "rounded-[18px] border border-[color:var(--color-blue)]/12 bg-white px-3 py-3 text-left shadow-[0_12px_26px_rgba(15,32,64,0.06)]"
                    : "rounded-[18px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-3 text-left transition duration-200 ease-out hover:border-[color:var(--color-line-strong)] hover:bg-white"
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 shrink-0 rounded-full ${signalToneClass}`}
                    />
                    <p className="truncate text-[13px] font-semibold text-[color:var(--color-ink)]">
                      {pair.symbol}
                    </p>
                  </div>
                  <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--color-ink-soft)]">
                    {formatSignalLabel(pair.action)}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[color:var(--color-muted)]">
                  {formatTrendDirection(pair.trendDirection)} ·{" "}
                  <span
                    className={
                      feedMode === "fallback"
                        ? "font-medium text-[color:var(--color-wait)]"
                        : "font-medium text-[color:var(--color-blue)]"
                    }
                  >
                    {formatFeedMode(feedMode)}
                  </span>
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
