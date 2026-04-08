import type { DashboardOverview } from "@trendx/api";
import { ArrowRight } from "lucide-react";
import type { ReactElement } from "react";
import { formatRationale } from "../lib/copy";
import type { DashboardFeedState } from "../lib/feed-state";
import {
  formatCheckSummary,
  formatSignalLabel,
  formatTrendDirection,
  formatUsd,
} from "../lib/formatters";
import type { DashboardSection } from "../lib/view-config";

interface CommandDeckProps {
  feedState: DashboardFeedState;
  onNavigate: (section: DashboardSection) => void;
  overview: DashboardOverview;
}

export function CommandDeck({
  feedState,
  onNavigate,
  overview,
}: CommandDeckProps): ReactElement {
  const firstPair = overview.pairs.at(0);

  if (!firstPair) {
    throw new Error("TrendX dashboard requires at least one tracked pair.");
  }

  const dominantPair = overview.pairs
    .slice(1)
    .reduce(
      (bestPair, pair) =>
        pair.confirmationCount > bestPair.confirmationCount ? pair : bestPair,
      firstPair,
    );
  const entryReadyCount = overview.pairs.filter(
    (pair) => pair.action === "ENTRY",
  ).length;
  const openCount = overview.pairs.filter(
    (pair) => pair.currentPosition.side !== "FLAT",
  ).length;
  const armedCount = overview.pairs.filter(
    (pair) => pair.executionStatus === "ARMED",
  ).length;
  const dominantPairCheckSummary = formatCheckSummary(
    dominantPair.confirmationCount,
    dominantPair.checklist.length,
    dominantPair.confirmationThreshold,
  );
  const lastRefresh = new Date(overview.generatedAt).toLocaleTimeString(
    "zh-CN",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  const deskNote = overview.killSwitchEnabled
    ? "总开关开启，只保留监控。"
    : feedState.hasReferenceRisk
      ? "信号实时，风控仍是参考账本。"
      : "信号与风控都处于联动状态。";

  return (
    <section className="hero-shell rounded-[26px] p-3 md:p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_250px] xl:items-start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
                主导交易对
              </p>
              <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-1.5">
                <p className="text-[clamp(1.55rem,2.35vw,2.1rem)] font-semibold leading-none tracking-[-0.06em] text-[color:var(--color-ink)]">
                  {dominantPair.symbol}
                </p>
                <div className="pb-0.5">
                  <p className="text-[13px] font-semibold text-[color:var(--color-ink)]">
                    {formatUsd(dominantPair.markPrice)}
                  </p>
                  <p className="text-[11px] text-[color:var(--color-muted)]">
                    标记价
                  </p>
                </div>
              </div>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-[color:var(--color-ink-soft)]">
                {formatRationale(dominantPair.symbol, dominantPair.rationale)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <span className="rounded-full border border-[color:var(--color-blue)]/18 bg-[color:var(--color-blue-fog)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-blue)]">
                {formatTrendDirection(dominantPair.trendDirection)}
              </span>
              <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
                {formatSignalLabel(dominantPair.action)}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                条件通过
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-[color:var(--color-ink)]">
                {dominantPairCheckSummary}
              </p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                订单块中位
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-[color:var(--color-ink)]">
                {formatUsd(dominantPair.orderBlock.mid)}
              </p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                失效点
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-[color:var(--color-ink)]">
                {formatUsd(dominantPair.stopLoss)}
              </p>
            </div>
            <div className="rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                最近刷新
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-[color:var(--color-ink)]">
                {lastRefresh}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("signals")}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[color:var(--color-blue)] bg-[color:var(--color-blue)] px-3.5 py-2 text-[13px] font-semibold text-[color:var(--color-surface-dark)] transition duration-200 ease-out hover:-translate-y-[1px] hover:bg-[color:var(--color-blue-soft)]"
            >
              查看信号
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("risk")}
              className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-2 text-[13px] font-semibold text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:-translate-y-[1px] hover:border-[color:var(--color-line-strong)]"
            >
              风险
            </button>
            <button
              type="button"
              onClick={() => onNavigate("journal")}
              className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-2 text-[13px] font-semibold text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:-translate-y-[1px] hover:border-[color:var(--color-line-strong)]"
            >
              日志
            </button>
          </div>
        </div>

        <div className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] p-3.5">
          <p className="mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
            运行快照
          </p>
          <div className="mt-3 grid gap-2.5">
            <div className="flex items-end justify-between gap-3 border-b border-[color:var(--color-line)] pb-2.5">
              <span className="text-[13px] text-[color:var(--color-muted)]">
                待入场
              </span>
              <span className="text-base font-semibold text-[color:var(--color-ink)]">
                {entryReadyCount}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3 border-b border-[color:var(--color-line)] pb-2.5">
              <span className="text-[13px] text-[color:var(--color-muted)]">
                活跃持仓
              </span>
              <span className="text-base font-semibold text-[color:var(--color-ink)]">
                {openCount}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3 border-b border-[color:var(--color-line)] pb-2.5">
              <span className="text-[13px] text-[color:var(--color-muted)]">
                已就绪
              </span>
              <span className="text-base font-semibold text-[color:var(--color-ink)]">
                {armedCount}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <span className="text-[13px] text-[color:var(--color-muted)]">
                风控模式
              </span>
              <span className="text-[13px] font-semibold text-[color:var(--color-ink)]">
                {feedState.hasReferenceRisk ? "参考账本" : "交易所联动"}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5 text-[13px] leading-5 text-[color:var(--color-ink-soft)]">
            {deskNote}
          </div>
        </div>
      </div>
    </section>
  );
}
