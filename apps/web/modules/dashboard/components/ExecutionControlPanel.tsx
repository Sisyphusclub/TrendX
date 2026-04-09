import type { DashboardOverview } from "@trendx/api";
import { LockKeyhole, ShieldCheck, Sparkles, Split, Zap } from "lucide-react";
import type { ReactElement } from "react";

import { Panel } from "@/modules/shared/components/Panel";

import { getExecutionBudget } from "../lib/execution-sizing";
import { formatUsd } from "../lib/formatters";
import type { DashboardSection } from "../lib/view-config";
import { AccountSecurityPanel } from "./AccountSecurityPanel";

interface ExecutionControlPanelProps {
  isReferenceOnly: boolean;
  onNavigate: (section: DashboardSection) => void;
  overview: DashboardOverview;
}

export function ExecutionControlPanel({
  isReferenceOnly,
  onNavigate,
  overview,
}: ExecutionControlPanelProps): ReactElement {
  const executionBudget = getExecutionBudget(
    overview.accountRisk.equity,
    overview.executionConfig,
  );
  const deployableCycles =
    executionBudget.marginUsd > 0
      ? Math.floor(
          overview.accountRisk.availableMargin / executionBudget.marginUsd,
        )
      : 0;
  const safeguardItems = [
    {
      detail: `Coinank 六项确认里至少满足 ${overview.executionConfig.confirmationThreshold} 项，且每一档触发前都要重新确认。`,
      label: "入场门槛",
    },
    {
      detail: `单个交易对总建仓保证金固定为权益的 ${overview.executionConfig.balanceAllocationPct}% ，在订单块内按 30 / 40 / 30 分三段布仓。`,
      label: "分段执行",
    },
    {
      detail: "订单块失效后，当前交易逻辑作废，系统直接退出到空仓。",
      label: "无效离场",
    },
  ] as const;

  return (
    <Panel
      aside={
        <div
          className={
            overview.killSwitchEnabled
              ? "rounded-full border border-[color:var(--color-bear)]/20 bg-[color:var(--color-bear-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-bear)]"
              : isReferenceOnly
                ? "rounded-full border border-[color:var(--color-blue)]/16 bg-[color:var(--color-blue-fog)] px-3 py-1 text-xs font-semibold text-[color:var(--color-blue)]"
                : "rounded-full border border-[color:var(--color-bull)]/20 bg-[color:var(--color-bull-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-bull)]"
          }
        >
          {overview.killSwitchEnabled
            ? "保护锁定"
            : isReferenceOnly
              ? "自动 / 参考"
              : "自动执行"}
        </div>
      }
      eyebrow="执行控制"
      title={isReferenceOnly ? "执行规则与参考边界" : "执行规则与资金边界"}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onNavigate("signals")}
          className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:-translate-y-[1px] hover:border-[color:var(--color-line-strong)]"
        >
          信号队列
        </button>
        <button
          type="button"
          onClick={() => onNavigate("risk")}
          className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:-translate-y-[1px] hover:border-[color:var(--color-line-strong)]"
        >
          市场新闻
        </button>
        <button
          type="button"
          onClick={() => onNavigate("journal")}
          className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--color-ink-soft)] transition duration-200 ease-out hover:-translate-y-[1px] hover:border-[color:var(--color-line-strong)]"
        >
          交易历史
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <AccountSecurityPanel />

        <div className="surface-dark rounded-[28px] border border-white/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mono text-[11px] uppercase tracking-[0.24em] muted-on-dark">
                执行纪律
              </p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.05em] text-white">
                只做顺势，不追单，失效即走。
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                所有动作都围绕已知区块展开，不在空中追价，只有大方向仍成立时才允许继续。
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
              <p className="mono text-[11px] uppercase tracking-[0.2em] muted-on-dark">
                总建仓保证金
              </p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.05em] text-white">
                {formatUsd(executionBudget.marginUsd)}
              </p>
              <p className="mt-2 text-sm text-white/68">
                权益 {overview.executionConfig.balanceAllocationPct}% ·{" "}
                {overview.executionConfig.leverage}x 名义{" "}
                {formatUsd(executionBudget.notionalUsd)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4">
              <Split className="size-4 text-white/76" />
              <p className="mt-4 text-sm font-semibold text-white">分段建仓</p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                订单块内按 30 / 40 / 30 执行。
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4">
              <Zap className="size-4 text-white/76" />
              <p className="mt-4 text-sm font-semibold text-white">杠杆模式</p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                20 倍全仓，严格按权益比例控制。
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4">
              <LockKeyhole className="size-4 text-white/76" />
              <p className="mt-4 text-sm font-semibold text-white">保护规则</p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                止损放在区块外，目标位看前高前低与下一流动性区域。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {safeguardItems.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4"
          >
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] text-[color:var(--color-blue)]">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                {item.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-soft)]">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-[24px] border border-[color:var(--color-line)] bg-[color:var(--color-surface-blue)] px-4 py-4 text-sm text-[color:var(--color-ink-soft)]">
        <Sparkles className="size-4 text-[color:var(--color-blue)]" />
        <span>
          {isReferenceOnly
            ? `当前参考保证金还能支持 ${deployableCycles} 组完整分段部署，每组 ${formatUsd(executionBudget.marginUsd)}。`
            : `当前可用保证金还能支持 ${deployableCycles} 组完整分段部署，每组 ${formatUsd(executionBudget.marginUsd)}。`}
        </span>
      </div>
    </Panel>
  );
}
