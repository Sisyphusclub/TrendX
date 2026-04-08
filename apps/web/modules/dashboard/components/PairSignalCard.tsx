import type { DashboardPair } from "@trendx/api";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDashed,
  ShieldCheck,
} from "lucide-react";
import type { ReactElement } from "react";

import { Panel } from "@/modules/shared/components/Panel";

import {
  formatChecklistLabel,
  formatRationale,
  formatRiskLabel,
} from "../lib/copy";
import {
  formatCheckSummary,
  formatCompact,
  formatExecutionStatus,
  formatFeedMode,
  formatPct,
  formatPositionSide,
  formatSignalLabel,
  formatTrendDirection,
  formatUsd,
} from "../lib/formatters";

interface PairSignalCardProps {
  feedMode: "fallback" | "live";
  isReferenceRisk: boolean;
  pair: DashboardPair;
}

function getTrendAccent(direction: DashboardPair["trendDirection"]): string {
  if (direction === "BULLISH") {
    return "border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] text-[color:var(--color-bull)]";
  }

  if (direction === "BEARISH") {
    return "border-[color:var(--color-bear)]/20 bg-[color:var(--color-bear-soft)] text-[color:var(--color-bear)]";
  }

  return "border-[color:var(--color-wait)]/20 bg-[color:var(--color-wait-soft)] text-[color:var(--color-wait)]";
}

function getSignalBadge(action: DashboardPair["action"]): string {
  if (action === "ENTRY") {
    return "border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] text-[color:var(--color-bull)]";
  }

  if (action === "EXIT") {
    return "border-[color:var(--color-bear)]/20 bg-[color:var(--color-bear-soft)] text-[color:var(--color-bear)]";
  }

  return "border-[color:var(--color-wait)]/20 bg-[color:var(--color-wait-soft)] text-[color:var(--color-wait)]";
}

export function PairSignalCard({
  feedMode,
  isReferenceRisk,
  pair,
}: PairSignalCardProps): ReactElement {
  const confirmationProgress = Math.min(
    pair.confirmationCount / pair.checklist.length,
    1,
  );

  const directionIcon =
    pair.trendDirection === "BEARISH" ? (
      <ArrowDownRight className="size-4" />
    ) : pair.trendDirection === "BULLISH" ? (
      <ArrowUpRight className="size-4" />
    ) : (
      <CircleDashed className="size-4" />
    );

  return (
    <Panel
      aside={
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getTrendAccent(pair.trendDirection)}`}
          >
            {directionIcon}
            <span>{formatTrendDirection(pair.trendDirection)}</span>
          </div>
          <p className="mt-3 text-sm font-medium text-[color:var(--color-muted)]">
            {formatExecutionStatus(pair.executionStatus)}
          </p>
        </div>
      }
      className="h-full"
      eyebrow={pair.symbol}
      title={formatSignalLabel(pair.action)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getSignalBadge(pair.action)}`}
        >
          {formatRiskLabel(pair.riskLabel)}
        </span>
        <span
          className={
            feedMode === "fallback"
              ? "rounded-full border border-[color:var(--color-wait)]/20 bg-[color:var(--color-wait-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-wait)]"
              : "rounded-full border border-[color:var(--color-blue)]/16 bg-[color:var(--color-blue-fog)] px-3 py-1 text-xs font-semibold text-[color:var(--color-blue)]"
          }
        >
          {formatFeedMode(feedMode)}
        </span>
        <span
          className={
            isReferenceRisk
              ? "rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1 text-xs font-semibold text-[color:var(--color-ink-soft)]"
              : "rounded-full border border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-bull)]"
          }
        >
          {isReferenceRisk ? "风险参考账本" : "风险实时联动"}
        </span>
        <span className="mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
          标记价 {formatUsd(pair.markPrice)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="max-w-2xl text-[15px] leading-7 text-[color:var(--color-ink-soft)]">
            {formatRationale(pair.symbol, pair.rationale)}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-blue)] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                订单块
              </p>
              <p className="mt-3 text-2xl font-bold tracking-[-0.05em] text-[color:var(--color-ink)]">
                {formatUsd(pair.orderBlock.low)}
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
                上沿 {formatUsd(pair.orderBlock.high)}
              </p>
              <p className="mt-3 text-sm text-[color:var(--color-muted)]">
                中位 {formatUsd(pair.orderBlock.mid)}
              </p>
            </div>

            <div className="rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
              <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                {isReferenceRisk ? "参考仓位" : "实时仓位"}
              </p>
              <p className="mt-3 text-2xl font-bold tracking-[-0.05em] text-[color:var(--color-ink)]">
                {formatPositionSide(pair.currentPosition.side)}
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
                {formatCompact(pair.currentPosition.sizeUsd)} 敞口
              </p>
              <p className="mt-3 text-sm text-[color:var(--color-muted)]">
                {isReferenceRisk ? "参考 PnL" : "PnL"}{" "}
                {formatUsd(pair.currentPosition.pnl)} /{" "}
                {pair.currentPosition.leverage}x 杠杆
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-[color:var(--color-ink-soft)]">
                确认度
              </span>
              <span className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                {formatCheckSummary(
                  pair.confirmationCount,
                  pair.checklist.length,
                  pair.confirmationThreshold,
                )}
              </span>
            </div>
            <div className="mt-3 h-3 rounded-full bg-[color:var(--color-canvas-strong)]">
              <div
                className="metric-glow h-3 rounded-full border border-white/50"
                style={{ width: `${confirmationProgress * 100}%` }}
              />
            </div>

            <div className="mt-4 grid gap-2 text-sm text-[color:var(--color-ink-soft)]">
              {pair.checklist.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-3 py-3"
                >
                  <span>{formatChecklistLabel(item.key)}</span>
                  <span
                    className={
                      item.matched
                        ? "text-[color:var(--color-bull)]"
                        : "text-[color:var(--color-line-strong)]"
                    }
                  >
                    <ShieldCheck className="size-4" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="surface-dark rounded-[28px] border border-white/10 p-4">
            <p className="mono text-[11px] uppercase tracking-[0.2em] muted-on-dark">
              分段执行
            </p>
            <div className="mt-4 grid gap-3">
              {pair.entryStages.map((stage) => (
                <div
                  key={stage.zone}
                  className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4"
                >
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="mono text-[11px] uppercase tracking-[0.2em] muted-on-dark">
                        {stage.zone === "upper"
                          ? "上沿"
                          : stage.zone === "mid"
                            ? "中段"
                            : "下沿"}
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-[-0.05em] text-white">
                        {stage.allocationPct}%
                      </p>
                    </div>
                    <p className="text-sm font-medium text-white/80">
                      {formatUsd(stage.plannedPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
            <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
              保护地图
            </p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                  止损
                </p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em] text-[color:var(--color-ink)]">
                  {formatUsd(pair.stopLoss)}
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                  止盈 1
                </p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em] text-[color:var(--color-ink)]">
                  {formatUsd(pair.takeProfitOne)}
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                  止盈 2
                </p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em] text-[color:var(--color-ink)]">
                  {formatUsd(pair.takeProfitTwo)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-[color:var(--color-ink-soft)]">
              OI {formatPct(pair.openInterestDeltaPct)}
            </span>
            <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-[color:var(--color-ink-soft)]">
              CVD {formatPct(pair.cvdBiasPct)}
            </span>
            <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-[color:var(--color-ink-soft)]">
              Funding {formatPct(pair.fundingRate)}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
