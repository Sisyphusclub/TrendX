import type { DashboardPair } from "@trendx/api";
import { ArrowRight, CircleCheckBig, Search, Target } from "lucide-react";
import type { ReactElement } from "react";

import { Panel } from "@/modules/shared/components/Panel";
import {
  formatCheckSummary,
  formatTrendDirection,
  formatUsd,
} from "../lib/formatters";

interface SignalTimelinePanelProps {
  pair: DashboardPair;
}

export function SignalTimelinePanel({
  pair,
}: SignalTimelinePanelProps): ReactElement {
  const triggeredStageCount = pair.entryStages.filter(
    (stage) => stage.status === "TRIGGERED",
  ).length;
  const nextStage = pair.entryStages.find((stage) => stage.status === "NEXT");
  const lockedStageCount = pair.entryStages.filter(
    (stage) => stage.status === "LOCKED",
  ).length;
  const steps = [
    {
      detail:
        pair.trendDirection === "NEUTRAL"
          ? `当前没有顺势确认，主订单块仍按 ${formatTrendDirection(pair.mainOrderBlockDirection)} 方向跟踪`
          : `${formatTrendDirection(pair.trendDirection)}方向已由 OI 与价格结构确认`,
      icon: Search,
      label: "方向判断",
      state: pair.trendDirection === "NEUTRAL" ? "watch" : "complete",
    },
    {
      detail: `主订单块 ${formatUsd(pair.mainOrderBlock.low)} 到 ${formatUsd(pair.mainOrderBlock.high)}`,
      icon: Target,
      label: "订单块",
      state: "active",
    },
    {
      detail: `${formatCheckSummary(
        pair.confirmationCount,
        pair.checklist.length,
        pair.confirmationThreshold,
      )}，并在目标区域内重新核对`,
      icon: CircleCheckBig,
      label: "确认条件",
      state:
        pair.confirmationCount >= pair.confirmationThreshold
          ? "active"
          : "watch",
    },
    {
      detail:
        lockedStageCount === pair.entryStages.length
          ? `分段执行未解锁，每一档触发前都要重新满足 ${pair.confirmationThreshold}/6 项，失效位在 ${formatUsd(pair.stopLoss)} 之外`
          : triggeredStageCount > 0
            ? `已触发 ${triggeredStageCount}/3 档${
                nextStage ? `，下一档 ${formatUsd(nextStage.plannedPrice)}` : ""
              }，剩余档位继续复核 ${pair.confirmationThreshold}/6 项，失效位在 ${formatUsd(pair.stopLoss)} 之外`
            : `首档等待 ${formatUsd(nextStage?.plannedPrice ?? pair.mainOrderBlock.mid)}，触发前先复核 ${pair.confirmationThreshold}/6 项，失效位在 ${formatUsd(pair.stopLoss)} 之外`,
      icon: ArrowRight,
      label: "执行计划",
      state:
        pair.action === "ENTRY"
          ? "active"
          : lockedStageCount === pair.entryStages.length
            ? "watch"
            : "active",
    },
  ] as const;

  return (
    <Panel eyebrow="信号路径" title={`${pair.symbol} 四步路径`}>
      <div className="grid gap-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const toneClass =
            step.state === "complete"
              ? "border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] text-[color:var(--color-bull)]"
              : step.state === "active"
                ? "border-[color:var(--color-blue)]/16 bg-[color:var(--color-blue-fog)] text-[color:var(--color-blue)]"
                : "border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] text-[color:var(--color-muted)]";

          return (
            <div
              key={step.label}
              className="relative rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4"
            >
              {index < steps.length - 1 ? (
                <span className="pointer-events-none absolute top-[52px] left-9 h-8 w-px bg-[color:var(--color-line)]" />
              ) : null}

              <div className="flex gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${toneClass}`}
                >
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                    步骤 {index + 1}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[color:var(--color-ink)]">
                    {step.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-soft)]">
                    {step.detail}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
