import type { DashboardExecutionHistory } from "@trendx/api";
import {
  ArrowDownRight,
  ArrowUpRight,
  ShieldEllipsis,
  Siren,
} from "lucide-react";
import type { ReactElement } from "react";

import { Panel } from "@/modules/shared/components/Panel";

import { formatHistoryTime } from "../lib/formatters";

interface ExecutionLogPanelProps {
  executionHistory: DashboardExecutionHistory | null;
  isLoading: boolean;
}

function getLogPresentation(item: DashboardExecutionHistory["items"][number]): {
  icon: typeof ArrowUpRight;
  tone: string;
} {
  if (item.type === "PROTECTION") {
    return {
      icon: ShieldEllipsis,
      tone: "text-[color:var(--color-blue)]",
    };
  }

  if (item.type === "CLOSE") {
    return {
      icon: Siren,
      tone: "text-[color:var(--color-muted)]",
    };
  }

  if (item.tone === "bear") {
    return {
      icon: ArrowDownRight,
      tone: "text-[color:var(--color-bear)]",
    };
  }

  return {
    icon: ArrowUpRight,
    tone:
      item.tone === "bull"
        ? "text-[color:var(--color-bull)]"
        : "text-[color:var(--color-muted)]",
  };
}

export function ExecutionLogPanel({
  executionHistory,
  isLoading,
}: ExecutionLogPanelProps): ReactElement {
  if (isLoading && !executionHistory) {
    return (
      <Panel eyebrow="交易历史" title="交易历史">
        <div className="grid gap-3">
          {[
            "history-skeleton-1",
            "history-skeleton-2",
            "history-skeleton-3",
            "history-skeleton-4",
          ].map((key) => (
            <div
              key={key}
              className="h-[92px] animate-pulse rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]"
            />
          ))}
        </div>
      </Panel>
    );
  }

  const items = executionHistory?.items ?? [];

  return (
    <Panel eyebrow="交易历史" title="交易历史">
      {items.length ? (
        <div className="grid gap-3">
          {items.map((item) => {
            const presentation = getLogPresentation(item);
            const Icon = presentation.icon;

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4"
              >
                <span
                  className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-soft)] ${presentation.tone}`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {item.label}
                    </p>
                    <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                      {formatHistoryTime(item.happenedAt)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-soft)]">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[22px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4 text-sm text-[color:var(--color-muted)]">
          暂无真实交易记录
        </div>
      )}
    </Panel>
  );
}
