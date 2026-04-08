import type { DashboardOverview } from "@trendx/api";
import {
  Bot,
  CircleCheckBig,
  ShieldEllipsis,
  Siren,
  TimerReset,
} from "lucide-react";
import type { ReactElement } from "react";

import { Panel } from "@/modules/shared/components/Panel";

import {
  formatCheckSummary,
  formatExecutionStatus,
  formatPct,
  formatPositionSide,
  formatUsd,
} from "../lib/formatters";

interface ExecutionLogPanelProps {
  isReferenceOnly: boolean;
  overview: DashboardOverview;
}

export function ExecutionLogPanel({
  isReferenceOnly,
  overview,
}: ExecutionLogPanelProps): ReactElement {
  const logs = overview.pairs.flatMap((pair) => [
    {
      detail: `${formatExecutionStatus(pair.executionStatus)} / ${formatPositionSide(pair.currentPosition.side)} / ${formatUsd(pair.currentPosition.sizeUsd)}`,
      icon: Bot,
      label: `${pair.symbol} 执行引擎`,
      time: "刚刚",
      tone: "text-[color:var(--color-blue)]",
    },
    {
      detail: `${formatCheckSummary(
        pair.confirmationCount,
        pair.checklist.length,
        pair.confirmationThreshold,
      )}, OI ${formatPct(pair.openInterestDeltaPct)}`,
      icon: CircleCheckBig,
      label: `${pair.symbol} 条件清单`,
      time: "8 分钟前",
      tone:
        pair.confirmationCount >= pair.confirmationThreshold
          ? "text-[color:var(--color-bull)]"
          : "text-[color:var(--color-wait)]",
    },
    {
      detail: `止损 ${formatUsd(pair.stopLoss)} / 止盈 1 ${formatUsd(pair.takeProfitOne)}`,
      icon: ShieldEllipsis,
      label: `${pair.symbol} 保护同步`,
      time: "18 分钟前",
      tone: "text-[color:var(--color-ink-soft)]",
    },
  ]);

  logs.push({
    detail: overview.killSwitchEnabled
      ? "需要人工介入"
      : isReferenceOnly
        ? "信号自动化仍在运行，但执行状态依然是参考账本"
        : "自动执行保持开启",
    icon: Siren,
    label: "全局保护",
    time: "24 分钟前",
    tone: overview.killSwitchEnabled
      ? "text-[color:var(--color-bear)]"
      : "text-[color:var(--color-bull)]",
  });

  logs.push({
    detail: `快照 ${new Date(overview.generatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`,
    icon: TimerReset,
    label: "调度记录",
    time: "1 小时节奏",
    tone: "text-[color:var(--color-muted)]",
  });

  return (
    <Panel
      eyebrow="运行日志"
      title={isReferenceOnly ? "参考执行记录" : "执行与调度记录"}
    >
      <div className="grid gap-3">
        {logs.map((log) => {
          const Icon = log.icon;

          return (
            <div
              key={`${log.label}-${log.time}`}
              className="flex items-start gap-3 rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4"
            >
              <span
                className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] ${log.tone}`}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                    {log.label}
                  </p>
                  <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                    {log.time}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-soft)]">
                  {log.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
