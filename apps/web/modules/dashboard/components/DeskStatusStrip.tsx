import type { DashboardOverview } from "@trendx/api";
import type { ReactElement } from "react";

import type { DashboardFeedState } from "../lib/feed-state";
import { formatFeedCapturedAt } from "../lib/formatters";

interface DeskStatusStripProps {
  feedState: DashboardFeedState;
  overview: DashboardOverview;
}

const statusItems = [
  {
    description: "节奏",
    key: "cadence",
    tone: "bg-[color:var(--color-blue)]",
  },
  {
    description: "信号",
    key: "feed",
    tone: "bg-[color:var(--color-bull)]",
  },
  {
    description: "风控",
    key: "riskModel",
    tone: "bg-[color:var(--color-blue-soft)]",
  },
  {
    description: "保护",
    key: "killSwitch",
    tone: "bg-[color:var(--color-ink)]",
  },
] as const;

export function DeskStatusStrip({
  feedState,
  overview,
}: DeskStatusStripProps): ReactElement {
  const entryReadyCount = overview.pairs.filter(
    (pair) => pair.action === "ENTRY",
  ).length;

  return (
    <section className="grid gap-2 lg:grid-cols-4">
      {statusItems.map((item) => {
        const value =
          item.key === "cadence"
            ? `${overview.cadenceMinutes} 分钟 / 1H`
            : item.key === "feed"
              ? feedState.hasFallbackPairs
                ? `${entryReadyCount} 个待触发 / 回退`
                : `${entryReadyCount} 个待触发 / 实时`
              : item.key === "riskModel"
                ? feedState.hasReferenceRisk
                  ? "参考账本"
                  : "交易所联动"
                : overview.killSwitchEnabled
                  ? "已锁定"
                  : "执行可用";

        return (
          <div
            key={item.key}
            className="rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5"
          >
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
              <span className={`size-2 rounded-full ${item.tone}`} />
              <span>{item.description}</span>
            </div>
            <div className="mt-1.5 flex items-end justify-between gap-3">
              <p className="text-[13px] font-semibold text-[color:var(--color-ink)] md:text-sm">
                {value}
              </p>
              <p className="text-[11px] text-[color:var(--color-muted)]">
                {item.key === "feed"
                  ? formatFeedCapturedAt(feedState.latestCapturedAt)
                  : item.key === "killSwitch"
                    ? "全局开关"
                    : item.key === "riskModel"
                      ? "模式"
                      : "固定节奏"}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
