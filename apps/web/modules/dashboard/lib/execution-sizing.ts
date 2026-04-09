import type { DashboardExecutionConfig } from "@trendx/api";

export function getExecutionBudget(
  equity: number,
  executionConfig: DashboardExecutionConfig,
): {
  marginUsd: number;
  notionalUsd: number;
} {
  const marginUsd = equity * (executionConfig.balanceAllocationPct / 100);

  return {
    marginUsd,
    notionalUsd: marginUsd * executionConfig.leverage,
  };
}

export function getEntryStageBudget(
  equity: number,
  executionConfig: DashboardExecutionConfig,
  allocationPct: number,
): {
  marginUsd: number;
  notionalUsd: number;
} {
  const { marginUsd: totalMarginUsd } = getExecutionBudget(
    equity,
    executionConfig,
  );
  const marginUsd = totalMarginUsd * (allocationPct / 100);

  return {
    marginUsd,
    notionalUsd: marginUsd * executionConfig.leverage,
  };
}
