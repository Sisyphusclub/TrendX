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
