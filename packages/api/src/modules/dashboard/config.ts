export const DASHBOARD_EXECUTION_CONFIG = {
  balanceAllocationPct: 10,
  confirmationThreshold: 3,
  leverage: 20,
  stageAllocations: [30, 40, 30] as const,
} as const;

export const DASHBOARD_ENTRY_BALANCE_ALLOCATION_RATIO =
  DASHBOARD_EXECUTION_CONFIG.balanceAllocationPct / 100;
