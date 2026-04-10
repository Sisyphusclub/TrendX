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

function getActionToneClasses(action: DashboardPair["action"]): string {
  if (action === "ENTRY") {
    return "border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] text-[color:var(--color-bull)]";
  }

  if (action === "EXIT") {
    return "border-[color:var(--color-bear)]/20 bg-[color:var(--color-bear-soft)] text-[color:var(--color-bear)]";
  }

  return "border-[color:var(--color-wait)]/20 bg-[color:var(--color-wait-soft)] text-[color:var(--color-wait)]";
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
  const recentSignals = rankedSignals.slice(0, 2);

  if (!dominantSignal) {
    throw new Error("TrendX overview requires at least one tracked pair.");
  }

  return (
    <section className="grid gap-4 pb-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-blue)]">
            总览
          </p>
          <h1 className="display mt-2 text-[clamp(1.45rem,2.2vw,2rem)] font-semibold leading-none tracking-[-0.06em] text-[color:var(--color-ink)]">
            主控台
          </h1>
          <p className="mt-1.5 text-sm text-[color:var(--color-muted)]">
            以 1 小时节奏监控 BTCUSDT 与 ETHUSDT 的顺势执行。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={
              feedState.hasLiveSignals
                ? "rounded-full border border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-bull)]"
                : "rounded-full border border-[color:var(--color-wait)]/20 bg-[color:var(--color-wait-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-wait)]"
            }
          >
            {feedState.hasLiveSignals ? "信号实时" : "信号回退"}
          </span>
          <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
            刷新 {liveTime}
          </span>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_0.88fr]">
        <section className="hero-shell rounded-[30px] px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getActionToneClasses(dominantSignal.action)}`}
                  >
                    {formatSignalLabel(dominantSignal.action)}
                  </span>
                  <span className="rounded-full border border-[color:var(--color-blue)]/16 bg-white/76 px-3 py-1 text-[11px] font-semibold text-[color:var(--color-blue)]">
                    {formatTrendDirection(dominantSignal.trendDirection)}
                  </span>
                  <span className="rounded-full border border-[color:var(--color-line)] bg-white/68 px-3 py-1 text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
                    1H
                  </span>
                </div>

                <h2 className="display mt-4 text-[clamp(1.9rem,4vw,3rem)] font-semibold tracking-[-0.08em] text-[color:var(--color-ink)]">
                  {dominantSignal.symbol}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--color-ink-soft)]">
                  {formatCheckSummary(
                    dominantSignal.confirmationCount,
                    dominantSignal.checklist.length,
                    dominantSignal.confirmationThreshold,
                  )}
                  ，当前执行状态{" "}
                  {formatExecutionStatus(dominantSignal.executionStatus)}，
                  {formatRiskLabel(dominantSignal.riskLabel)}。
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[22px] border border-[color:var(--color-line)] bg-white/68 px-4 py-4">
                  <p className="mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-blue)]">
                    主订单块
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                    {formatUsd(dominantSignal.mainOrderBlock.low)} -{" "}
                    {formatUsd(dominantSignal.mainOrderBlock.high)}
                  </p>
                  <p className="mt-1.5 text-xs text-[color:var(--color-muted)]">
                    中位 {formatUsd(dominantSignal.mainOrderBlock.mid)}
                  </p>
                  {dominantSignal.previousOppositeOrderBlock ? (
                    <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                      上一反向块{" "}
                      {formatUsd(dominantSignal.previousOppositeOrderBlock.low)}{" "}
                      -{" "}
                      {formatUsd(
                        dominantSignal.previousOppositeOrderBlock.high,
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-[color:var(--color-line)] bg-white/68 px-4 py-4">
                  <p className="mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-blue)]">
                    标记价格
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                    {formatUsd(dominantSignal.markPrice)}
                  </p>
                  <p className="mt-1.5 text-xs text-[color:var(--color-muted)]">
                    {liveTime} 更新
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[color:var(--color-line)] bg-white/72 px-4 py-4">
                <p className="text-sm text-[color:var(--color-muted)]">
                  信号触发
                </p>
                <p className="mt-3 text-[1.8rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
                  {readyCount}
                </p>
                <p className="mt-1.5 text-xs text-[color:var(--color-muted)]">
                  {waitCount} 个交易对继续等待
                </p>
              </div>

              <div className="rounded-[22px] border border-[color:var(--color-line)] bg-white/72 px-4 py-4">
                <p className="text-sm text-[color:var(--color-muted)]">PNL</p>
                <p
                  className={
                    totalPnl >= 0
                      ? "mt-3 text-[1.8rem] font-semibold tracking-[-0.06em] text-[color:var(--color-bull)]"
                      : "mt-3 text-[1.8rem] font-semibold tracking-[-0.06em] text-[color:var(--color-bear)]"
                  }
                >
                  {formatUsd(totalPnl)}
                </p>
                <p className="mt-1.5 text-xs text-[color:var(--color-muted)]">
                  日内账本 + 持仓浮盈亏
                </p>
              </div>

              <div className="rounded-[22px] border border-[color:var(--color-line)] bg-white/72 px-4 py-4">
                <p className="text-sm text-[color:var(--color-muted)]">
                  风险暴露
                </p>
                <p className="mt-3 text-[1.8rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
                  {overview.accountRisk.exposurePct.toFixed(1)}%
                </p>
                <p className="mt-1.5 text-xs text-[color:var(--color-muted)]">
                  已用保证金 {formatUsd(overview.accountRisk.usedMargin)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenSignalPair(dominantSignal.symbol)}
                className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--color-blue)] bg-[color:var(--color-blue)] px-4 py-2 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-[1px] hover:bg-[color:var(--color-blue-soft)]"
              >
                查看 {dominantSignal.symbol} 信号
              </button>
              <button
                type="button"
                onClick={() => onSectionChange("controls")}
                className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--color-line)] bg-white/76 px-4 py-2 text-sm font-semibold text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:-translate-y-[1px] hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-ink)]"
              >
                进入设置
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4">
          <section className="panel-shell rounded-[28px] px-5 py-5">
            <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-blue)]">
              账户状态
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                  权益
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                  {formatUsd(overview.accountRisk.equity)}
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                  可用保证金
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                  {formatUsd(overview.accountRisk.availableMargin)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={
                  overview.killSwitchEnabled
                    ? "rounded-full border border-[color:var(--color-bear)]/20 bg-[color:var(--color-bear-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-bear)]"
                    : "rounded-full border border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-bull)]"
                }
              >
                {overview.killSwitchEnabled ? "总开关已开启" : "自动执行可用"}
              </span>
              <span
                className={
                  feedState.hasReferenceRisk
                    ? "rounded-full border border-[color:var(--color-blue)]/16 bg-[color:var(--color-blue-fog)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-blue)]"
                    : "rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-ink-soft)]"
                }
              >
                {feedState.hasReferenceRisk ? "风控参考账本" : "风控实时联动"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSectionChange("controls")}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-ink)] transition duration-200 ease-out hover:text-[color:var(--color-blue)]"
            >
              查看设置
              <ArrowRight className="size-4" />
            </button>
          </section>

          <section className="panel-shell rounded-[28px] px-5 py-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-blue)]">
                  最近信号
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                  优先关注
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSectionChange("signals")}
                className="text-sm font-medium text-[color:var(--color-muted)] transition duration-200 ease-out hover:text-[color:var(--color-ink)]"
              >
                查看全部
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {recentSignals.map((pair) => (
                <button
                  key={pair.symbol}
                  type="button"
                  onClick={() => onOpenSignalPair(pair.symbol)}
                  className="group flex w-full items-center gap-4 rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-4 py-4 text-left transition duration-200 ease-out hover:border-[color:var(--color-line-strong)] hover:bg-white"
                >
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-[18px] border border-[color:var(--color-line)] bg-white">
                    <span className="text-sm font-semibold tracking-[0.14em] text-[color:var(--color-ink-soft)]">
                      {pair.symbol.replace("USDT", "")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getActionToneClasses(pair.action)}`}
                      >
                        {formatSignalLabel(pair.action)}
                      </span>
                      <span className="text-[11px] text-[color:var(--color-muted)]">
                        {formatTrendDirection(pair.trendDirection)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--color-ink)]">
                      {pair.symbol}
                    </p>
                    <p className="mt-1 text-[12px] text-[color:var(--color-muted)]">
                      {formatCheckSummary(
                        pair.confirmationCount,
                        pair.checklist.length,
                        pair.confirmationThreshold,
                      )}{" "}
                      · {formatExecutionStatus(pair.executionStatus)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {marketTiles.map((tile) => (
          <div
            key={tile.key}
            className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4"
          >
            <div className="flex items-center gap-2">
              <span
                className={
                  tile.tone === "bull"
                    ? "size-2 rounded-full bg-[color:var(--color-bull)]"
                    : "size-2 rounded-full bg-[color:var(--color-bear)]"
                }
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                {tile.caption}
              </p>
            </div>
            <p className="mt-3 text-[1rem] font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
              {tile.value}
            </p>
          </div>
        ))}
      </section>
    </section>
  );
}
