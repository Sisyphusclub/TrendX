import { schema } from "@trendx/database";
import { and, desc, eq } from "@trendx/database/drizzle/operators";

import { getDatabaseClient } from "../../../lib/database";
import {
  getCycleCapturedAt,
  getSignalTimeframe,
} from "../../dashboard/lib/run-signal-cycle";
import type {
  DashboardExecutionConfig,
  DashboardPair,
  GetDashboardOverviewOutput,
} from "../../dashboard/types";

function getStageMarginRequirementUsd(
  equity: number,
  executionConfig: DashboardExecutionConfig,
  allocationPct: number,
): number {
  return (
    equity *
    (executionConfig.balanceAllocationPct / 100) *
    (allocationPct / 100)
  );
}

function getStageNotionalRequirementUsd(
  equity: number,
  executionConfig: DashboardExecutionConfig,
  allocationPct: number,
): number {
  return (
    getStageMarginRequirementUsd(equity, executionConfig, allocationPct) *
    executionConfig.leverage
  );
}

function getDailyLossPct(
  accountRisk: GetDashboardOverviewOutput["overview"]["accountRisk"],
): number {
  if (accountRisk.dailyPnl >= 0 || accountRisk.equity <= 0) {
    return 0;
  }

  return (Math.abs(accountRisk.dailyPnl) / accountRisk.equity) * 100;
}

function hasCurrentPairFeedCycle(
  overviewResult: GetDashboardOverviewOutput,
  symbol: DashboardPair["symbol"],
): boolean {
  const pairFeed = overviewResult.feed.pairs.find(
    (candidate) => candidate.symbol === symbol,
  );

  if (!pairFeed?.capturedAt) {
    return false;
  }

  const timeframe = getSignalTimeframe();
  const expectedCycle = getCycleCapturedAt(
    overviewResult.overview.generatedAt,
    timeframe,
  ).getTime();
  const actualCycle = getCycleCapturedAt(
    pairFeed.capturedAt,
    timeframe,
  ).getTime();

  return expectedCycle === actualCycle;
}

async function hasCurrentSignalCycleRecord(
  symbol: DashboardPair["symbol"],
  overviewGeneratedAt: string,
): Promise<boolean> {
  const db = getDatabaseClient();

  if (!db) {
    return false;
  }

  const timeframe = getSignalTimeframe();
  const cycleCapturedAt = getCycleCapturedAt(overviewGeneratedAt, timeframe);
  const [signal] = await db
    .select({
      id: schema.tradingSignals.id,
    })
    .from(schema.tradingSignals)
    .where(
      and(
        eq(schema.tradingSignals.createdAt, cycleCapturedAt),
        eq(schema.tradingSignals.symbol, symbol),
        eq(schema.tradingSignals.timeframe, timeframe),
      ),
    )
    .limit(1);

  return signal !== undefined;
}

async function getLatestClosedPositionUpdatedAt(
  symbol: DashboardPair["symbol"],
): Promise<Date | null> {
  const db = getDatabaseClient();

  if (!db) {
    return null;
  }

  const [position] = await db
    .select({
      updatedAt: schema.positions.updatedAt,
    })
    .from(schema.positions)
    .where(
      and(
        eq(schema.positions.symbol, symbol),
        eq(schema.positions.status, "CLOSED"),
      ),
    )
    .orderBy(desc(schema.positions.updatedAt))
    .limit(1);

  return position?.updatedAt ?? null;
}

export async function getHardRiskBlockReason(params: {
  overviewResult: GetDashboardOverviewOutput;
  pair: DashboardPair;
  stage: DashboardPair["entryStages"][number];
}): Promise<string | null> {
  const executionConfig = params.overviewResult.overview.executionConfig;
  const hardRisk = executionConfig.hardRisk;
  const accountRisk = params.overviewResult.overview.accountRisk;

  if (accountRisk.equity <= 0) {
    return "硬风控拦截：账户权益异常，禁止执行。";
  }

  const dailyLossPct = getDailyLossPct(accountRisk);

  if (dailyLossPct >= hardRisk.maxDailyLossPct) {
    return `硬风控拦截：当日亏损 ${dailyLossPct.toFixed(2)}% 已达到上限 ${hardRisk.maxDailyLossPct.toFixed(2)}%。`;
  }

  const stageMarginRequirementUsd = getStageMarginRequirementUsd(
    accountRisk.equity,
    executionConfig,
    params.stage.allocationPct,
  );

  if (accountRisk.availableMargin < stageMarginRequirementUsd) {
    return `硬风控拦截：当前可用保证金 ${accountRisk.availableMargin.toFixed(2)} 低于本档所需保证金 ${stageMarginRequirementUsd.toFixed(2)}。`;
  }

  const projectedExposurePct =
    accountRisk.exposurePct +
    (getStageNotionalRequirementUsd(
      accountRisk.equity,
      executionConfig,
      params.stage.allocationPct,
    ) /
      accountRisk.equity) *
      100;

  if (projectedExposurePct > hardRisk.maxExposurePct) {
    return `硬风控拦截：本档执行后总敞口预计 ${projectedExposurePct.toFixed(2)}%，超过上限 ${hardRisk.maxExposurePct.toFixed(2)}%。`;
  }

  if (hardRisk.requireCurrentSignalCycle) {
    const hasCurrentPairFeed = hasCurrentPairFeedCycle(
      params.overviewResult,
      params.pair.symbol,
    );

    if (!hasCurrentPairFeed) {
      return "硬风控拦截：当前交易对快照不是本小时最新周期，禁止执行。";
    }

    const hasCurrentSignalCycle = await hasCurrentSignalCycleRecord(
      params.pair.symbol,
      params.overviewResult.overview.generatedAt,
    );

    if (!hasCurrentSignalCycle) {
      return "硬风控拦截：当前小时信号周期尚未落库，禁止执行。";
    }
  }

  if (
    params.pair.currentPosition.side === "FLAT" &&
    hardRisk.cooldownMinutesAfterClose > 0
  ) {
    const latestClosedPositionUpdatedAt =
      await getLatestClosedPositionUpdatedAt(params.pair.symbol);

    if (latestClosedPositionUpdatedAt) {
      const cooldownEndsAt =
        latestClosedPositionUpdatedAt.getTime() +
        hardRisk.cooldownMinutesAfterClose * 60 * 1000;

      if (Date.now() < cooldownEndsAt) {
        const remainingMinutes = Math.ceil(
          (cooldownEndsAt - Date.now()) / (60 * 1000),
        );

        return `硬风控拦截：${params.pair.symbol} 平仓后冷却期未结束，还需等待约 ${remainingMinutes} 分钟。`;
      }
    }
  }

  return null;
}
