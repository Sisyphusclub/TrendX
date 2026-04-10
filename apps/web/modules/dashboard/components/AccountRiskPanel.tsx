import type { DashboardOverview } from "@trendx/api";
import { ShieldAlert, TimerReset } from "lucide-react";
import type { ReactElement } from "react";

import { Panel } from "@/modules/shared/components/Panel";

import { formatPct, formatUsd } from "../lib/formatters";

interface AccountRiskPanelProps {
  accountRisk: DashboardOverview["accountRisk"];
  executionConfig: DashboardOverview["executionConfig"];
  generatedAt: string;
  isReferenceOnly: boolean;
  killSwitchEnabled: boolean;
}

export function AccountRiskPanel({
  accountRisk,
  executionConfig,
  generatedAt,
  isReferenceOnly,
  killSwitchEnabled,
}: AccountRiskPanelProps): ReactElement {
  return (
    <Panel
      aside={
        <div className="flex flex-wrap justify-end gap-2">
          <div
            className={
              isReferenceOnly
                ? "rounded-full border border-[color:var(--color-blue)]/16 bg-[color:var(--color-blue-fog)] px-3 py-1 text-xs font-semibold text-[color:var(--color-blue)]"
                : "rounded-full border border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-bull)]"
            }
          >
            {isReferenceOnly ? "参考账户" : "交易所联动"}
          </div>
          <div
            className={
              killSwitchEnabled
                ? "rounded-full border border-[color:var(--color-bear)]/20 bg-[color:var(--color-bear-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-bear)]"
                : "rounded-full border border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-bull)]"
            }
          >
            {killSwitchEnabled ? "总开关已开启" : "允许执行"}
          </div>
        </div>
      }
      className="h-full"
      eyebrow="资金风险"
      title={isReferenceOnly ? "风险参考快照" : "账户风险快照"}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-blue)] p-5">
          <p className="text-sm font-medium text-[color:var(--color-muted)]">
            {isReferenceOnly ? "参考权益" : "权益"}
          </p>
          <p className="mt-3 text-4xl font-bold tracking-[-0.05em] text-[color:var(--color-ink)]">
            {formatUsd(accountRisk.equity)}
          </p>
        </div>
        <div className="rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <p className="text-sm font-medium text-[color:var(--color-muted)]">
            {isReferenceOnly ? "参考敞口" : "总敞口"}
          </p>
          <p className="mt-3 text-4xl font-bold tracking-[-0.05em] text-[color:var(--color-ink)]">
            {formatPct(accountRisk.exposurePct)}
          </p>
        </div>
        <div className="rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <p className="text-sm font-medium text-[color:var(--color-muted)]">
            {isReferenceOnly ? "参考已用保证金" : "已用保证金"}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[color:var(--color-ink)]">
            {formatUsd(accountRisk.usedMargin)}
          </p>
        </div>
        <div className="rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <p className="text-sm font-medium text-[color:var(--color-muted)]">
            {isReferenceOnly ? "参考可用保证金" : "可用保证金"}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[color:var(--color-ink)]">
            {formatUsd(accountRisk.availableMargin)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4 text-sm text-[color:var(--color-ink-soft)]">
          <ShieldAlert className="size-4 text-[color:var(--color-wait)]" />
          <span>
            {isReferenceOnly
              ? `参考账本中展示 ${accountRisk.openPositionCount} 个仓位槽位`
              : `当前有 ${accountRisk.openPositionCount} 个实盘仓位受监控`}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4 text-sm text-[color:var(--color-ink-soft)]">
          <TimerReset className="size-4 text-[color:var(--color-blue)]" />
          <span>
            快照时间{" "}
            {new Date(generatedAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <div className="surface-dark mt-4 rounded-[28px] border border-white/10 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium muted-on-dark">
              {isReferenceOnly ? "参考当日 PnL" : "当日 PnL"}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-[-0.05em] text-white">
              {formatUsd(accountRisk.dailyPnl)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:w-[54%]">
            <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
              <p className="mono text-[11px] uppercase tracking-[0.22em] muted-on-dark">
                调度频率
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                1 小时一次
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
              <p className="mono text-[11px] uppercase tracking-[0.22em] muted-on-dark">
                仓位规则
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                余额 {executionConfig.balanceAllocationPct}% /{" "}
                {executionConfig.leverage} 倍全仓
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
            <p className="mono text-[11px] uppercase tracking-[0.22em] muted-on-dark">
              日亏损上限
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {executionConfig.hardRisk.maxDailyLossPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
            <p className="mono text-[11px] uppercase tracking-[0.22em] muted-on-dark">
              总敞口上限
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatPct(executionConfig.hardRisk.maxExposurePct)}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
            <p className="mono text-[11px] uppercase tracking-[0.22em] muted-on-dark">
              平仓冷却
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {executionConfig.hardRisk.cooldownMinutesAfterClose} 分钟
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
