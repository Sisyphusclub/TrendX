export interface LatestAccountSnapshotRecord {
  availableMargin: number;
  equity: number;
  exposurePct: number;
  openPositionCount: number;
  realizedPnl: number;
  unrealizedPnl: number;
  usedMargin: number;
}

export interface LatestSignalRecord {
  action: "ENTRY" | "EXIT" | "WAIT";
  confirmationCount: number;
  symbol: "BTCUSDT" | "ETHUSDT";
  trendDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export async function getLatestAccountSnapshot(): Promise<LatestAccountSnapshotRecord | null> {
  return null;
}

export async function listLatestSignalRecords(): Promise<LatestSignalRecord[]> {
  return [];
}
