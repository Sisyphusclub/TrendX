import type { DashboardOverview, DashboardPair } from "@trendx/api";
import { ArrowRight } from "lucide-react";
import type { ReactElement } from "react";

import { formatRiskLabel } from "../lib/copy";
import type { DashboardFeedState } from "../lib/feed-state";
import {
  formatCheckSummary,
  formatExecutionStatus,
  formatPct,
  formatSignalLabel,
  formatTrendDirection,
  formatUsd,
} from "../lib/formatters";
import type { DashboardSection } from "../lib/view-config";

interface OverviewDashboardProps {
  feedState: DashboardFeedState;
  onOpenSignalPair: (symbol: DashboardPair["symbol"]) => void;
  onSectionChange: (section: DashboardSection) => void;
  overview: DashboardOverview;
}

interface MarketTile {
  caption: string;
  key: string;
  tone: "bear" | "bull";
  value: string;
}

const actionPriority = {
  ENTRY: 2,
  EXIT: 1,
  WAIT: 0,
} as const satisfies Record<DashboardPair["action"], number>;

function getTone(value: number): MarketTile["tone"] {
  return value >= 0 ? "bull" : "bear";
}

function getToneClasses(tone: MarketTile["tone"]): string {
  return tone === "bull"
    ? "bg-[color:var(--color-bull-soft)] text-[color:var(--color-bull)]"
    : "bg-[color:var(--color-bear-soft)] text-[color:var(--color-bear)]";
}

function buildMarketTiles(
  pairs: DashboardOverview["pairs"],
): Array<MarketTile> {
  return pairs.flatMap((pair) => [
    {
      caption: `${pair.symbol.replace("USDT", "")} 价格`,
      key: `${pair.symbol}-price`,
      tone: getTone(pair.openInterestDeltaPct),
      value: formatUsd(pair.markPrice),
    },
    {
      caption: `${pair.symbol.replace("USDT", "")} OI ${formatPct(pair.openInterestDeltaPct)}`,
      key: `${pair.symbol}-oi`,
      tone: getTone(pair.openInterestDeltaPct),
      value: formatPct(pair.openInterestDeltaPct),
    },
    {
      caption: `${pair.symbol.replace("USDT", "")} CVD ${formatPct(pair.cvdBiasPct)}`,
      key: `${pair.symbol}-cvd`,
      tone: getTone(pair.cvdBiasPct),
      value: formatPct(pair.cvdBiasPct),
    },
  ]);
}

export function OverviewDashboard({
  feedState,
  onOpenSignalPair,
  onSectionChange,
  overview,
}: OverviewDashboardProps): ReactElement {
  const liveTime = new Date(overview.generatedAt).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const marketTiles = buildMarketTiles(overview.pairs);
  const readyCount = overview.pairs.filter(
    (pair) => pair.action === "ENTRY",
  ).length;
  const waitCount = overview.pairs.filter(
    (pair) => pair.action === "WAIT",
  ).length;
  const totalPnl =
    overview.accountRisk.dailyPnl +
    overview.pairs.reduce((sum, pair) => sum + pair.currentPosition.pnl, 0);
  const rankedSignals = [...overview.pairs].sort((left, right) => {
    const actionDelta =
      actionPriority[right.action] - actionPriority[left.action];

    if (actionDelta !== 0) {
      return actionDelta;
    }

    return right.confirmationCount - left.confirmationCount;
  });
  const dominantSignal = rankedSignals[0] ?? overview.pairs.at(0);

  if (!dominantSignal) {
    throw new Error("TrendX overview requires at least one tracked pair.");
  }

  return (
    <section className="grid gap-6 pb-6 pr-1">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
            总览
          </p>
          <h1 className="display mt-2 text-[clamp(1.6rem,2.7vw,2.45rem)] font-semibold leading-none tracking-[-0.06em] text-[color:var(--color-ink)]">
            仪表板
          </h1>
          <p className="mt-2 text-sm text-[color:var(--color-muted)]">
            欢迎回来，主交易席位。
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm text-[color:var(--color-muted)]">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[color:var(--color-bull)]" />
            <span>
              {feedState.hasLiveSignals
                ? "热门行情（实时）"
                : "热门行情（回退）"}
            </span>
          </div>
          <span>{liveTime}</span>
        </div>
      </header>

      <section className="grid gap-3 xl:grid-cols-6 md:grid-cols-3 sm:grid-cols-2">
        {marketTiles.map((tile) => (
          <div
            key={tile.key}
            className="relative overflow-hidden rounded-[2px] border border-[color:var(--color-line)] bg-[rgba(8,8,8,0.82)] px-4 py-4"
          >
            <span
              className={`absolute inset-y-0 left-0 w-[3px] ${tile.tone === "bull" ? "bg-[color:var(--color-bull)]" : "bg-[color:var(--color-bear)]"}`}
            />
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">
              {tile.caption}
            </p>
            <p className="mt-4 text-[1.05rem] font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
              {tile.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_0.96fr]">
        <div className="rounded-[2px] border border-[color:var(--color-line)] bg-[rgba(7,7,7,0.78)] px-6 py-5">
          <p className="text-sm text-[color:var(--color-muted)]">信号触发</p>
          <p className="mt-4 text-[2rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
            {readyCount}
          </p>
          <p className="mt-2 text-[13px] text-[color:var(--color-muted)]">
            {waitCount} 个交易对继续等待
          </p>
        </div>

        <div className="rounded-[2px] border border-[color:var(--color-line)] bg-[rgba(7,7,7,0.78)] px-6 py-5">
          <p className="text-sm text-[color:var(--color-muted)]">PNL</p>
          <p
            className={
              totalPnl >= 0
                ? "mt-4 text-[2rem] font-semibold tracking-[-0.06em] text-[color:var(--color-bull)]"
                : "mt-4 text-[2rem] font-semibold tracking-[-0.06em] text-[color:var(--color-bear)]"
            }
          >
            {formatUsd(totalPnl)}
          </p>
          <p className="mt-2 text-[13px] text-[color:var(--color-muted)]">
            日内账本 + 持仓浮盈亏
          </p>
        </div>

        <div className="rounded-[2px] border border-[color:var(--color-line)] bg-[rgba(7,7,7,0.78)] px-6 py-5">
          <p className="text-sm text-[color:var(--color-muted)]">风险暴露</p>
          <p className="mt-4 text-[2rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
            {overview.accountRisk.exposurePct.toFixed(1)}%
          </p>
          <p className="mt-2 text-[13px] text-[color:var(--color-muted)]">
            已用保证金 {formatUsd(overview.accountRisk.usedMargin)}
          </p>
        </div>

        <div className="rounded-[2px] border border-[color:var(--color-line)] bg-[rgba(7,7,7,0.78)] px-5 py-5">
          <div className="flex items-center gap-2">
            <span
              className={`size-7 rounded-[2px] border border-[color:var(--color-line)] ${overview.killSwitchEnabled ? "bg-[color:var(--color-bear-soft)]" : "bg-[color:var(--color-surface)]"}`}
            />
            <span className="rounded-[2px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]">
              {feedState.hasLiveSignals ? "LIVE" : "SYNC"}
            </span>
          </div>
          <p className="mt-4 text-[1.1rem] font-semibold text-[color:var(--color-ink)]">
            {overview.killSwitchEnabled ? "自动执行已锁定" : "自动执行可用"}
          </p>
          <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
            {feedState.hasReferenceRisk
              ? "当前风控为参考账本。"
              : "当前风控与交易所联动。"}
          </p>
          <button
            type="button"
            onClick={() => onSectionChange("controls")}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink)] transition duration-200 ease-out hover:text-[color:var(--color-blue)]"
          >
            查看执行规则
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="display text-[1.55rem] font-semibold tracking-[-0.045em] text-[color:var(--color-ink)]">
              最近信号
            </h2>
            <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
              当前优先关注 {dominantSignal.symbol}。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSectionChange("signals")}
            className="text-sm font-medium text-[color:var(--color-muted)] transition duration-200 ease-out hover:text-[color:var(--color-ink)]"
          >
            查看全部
          </button>
        </div>

        <div className="grid gap-3">
          {rankedSignals.slice(0, 1).map((pair) => {
            const actionTone = getToneClasses(
              pair.action === "WAIT" ? "bear" : "bull",
            );

            return (
              <button
                key={pair.symbol}
                type="button"
                onClick={() => onOpenSignalPair(pair.symbol)}
                className="group flex w-full items-center gap-4 rounded-[2px] border border-[color:var(--color-line)] bg-[rgba(7,7,7,0.78)] px-4 py-4 text-left transition duration-200 ease-out hover:border-[color:var(--color-line-strong)] hover:bg-[rgba(10,10,10,0.9)]"
              >
                <div className="flex size-16 shrink-0 items-center justify-center rounded-[2px] border border-[color:var(--color-line)] bg-black/50">
                  <span className="text-sm font-semibold tracking-[0.14em] text-[color:var(--color-ink-soft)]">
                    {pair.symbol.replace("USDT", "")}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-[2px] border border-current/12 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${actionTone}`}
                    >
                      {formatSignalLabel(pair.action)}
                    </span>
                    <span className="text-xs text-[color:var(--color-muted)]">
                      1H
                    </span>
                    <span className="text-xs text-[color:var(--color-muted)]">
                      {formatTrendDirection(pair.trendDirection)}
                    </span>
                  </div>
                  <p className="mt-3 text-[1.05rem] font-semibold text-[color:var(--color-ink)]">
                    BINANCE:{pair.symbol}
                  </p>
                  <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
                    {liveTime} · {formatRiskLabel(pair.riskLabel)}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right md:block">
                  <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                    {formatCheckSummary(
                      pair.confirmationCount,
                      pair.checklist.length,
                      pair.confirmationThreshold,
                    )}
                  </p>
                  <p className="mt-1 text-[12px] text-[color:var(--color-muted)]">
                    {formatExecutionStatus(pair.executionStatus)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}
