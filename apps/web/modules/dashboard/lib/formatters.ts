import type { DashboardPair } from "@trendx/api";

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

export function formatCheckSummary(
  matched: number,
  total: number,
  threshold?: number,
): string {
  if (threshold === undefined) {
    return `${matched}/${total} 项`;
  }

  return `${matched}/${total} 项，${threshold} 项触发`;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

export function formatSignalLabel(value: "ENTRY" | "EXIT" | "WAIT"): string {
  if (value === "ENTRY") {
    return "准备入场";
  }

  if (value === "EXIT") {
    return "立即离场";
  }

  return "继续等待";
}

export function formatTrendDirection(
  value: DashboardPair["trendDirection"],
): string {
  if (value === "BULLISH") {
    return "看多";
  }

  if (value === "BEARISH") {
    return "看空";
  }

  return "中性";
}

export function formatExecutionStatus(
  value: DashboardPair["executionStatus"],
): string {
  if (value === "ARMED") {
    return "已就绪";
  }

  if (value === "OPEN") {
    return "持仓中";
  }

  if (value === "PROTECTED") {
    return "已保护";
  }

  if (value === "HALTED") {
    return "已暂停";
  }

  return "等待中";
}

export function formatPositionSide(
  value: DashboardPair["currentPosition"]["side"],
): string {
  if (value === "LONG") {
    return "多头";
  }

  if (value === "SHORT") {
    return "空头";
  }

  return "空仓";
}

export function formatFeedMode(value: "fallback" | "live"): string {
  if (value === "fallback") {
    return "种子回退";
  }

  return "Coinank 实时";
}

export function formatEntryStageStatus(
  value: DashboardPair["entryStages"][number]["status"],
): string {
  if (value === "TRIGGERED") {
    return "已触发";
  }

  if (value === "NEXT") {
    return "下一档";
  }

  if (value === "WAITING") {
    return "等待";
  }

  return "未解锁";
}

export function formatHistoryTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const diffMs = Date.now() - date.getTime();

  if (diffMs < 60_000) {
    return "刚刚";
  }

  if (diffMs < 60 * 60 * 1000) {
    return `${Math.max(1, Math.floor(diffMs / 60_000))} 分钟前`;
  }

  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}
