import { randomUUID } from "node:crypto";

import { schema } from "@trendx/database";
import { and, desc, eq, inArray } from "@trendx/database/drizzle/operators";
import { logger } from "@trendx/logs";

import { getDatabaseClient } from "../../../lib/database";
import {
  getCycleCapturedAt,
  getSignalTimeframe,
  persistDashboardPairSignalSnapshot,
} from "../../dashboard/lib/run-signal-cycle";
import type {
  DashboardExecutionConfig,
  DashboardPair,
} from "../../dashboard/types";
import type {
  BinanceAccountInformation,
  BinancePlacedAlgoOrder,
  BinancePlacedOrder,
  BinanceTrackedPosition,
} from "../../exchange/lib/binance-client";

const ACTIVE_PLAN_STATUSES = [
  "PENDING",
  "ARMED",
  "OPEN",
  "PROTECTED",
  "HALTED",
] as const;

interface PersistEntryExecutionParams {
  account: BinanceAccountInformation;
  executionConfig: DashboardExecutionConfig;
  order: BinancePlacedOrder;
  overviewGeneratedAt: string;
  overviewReason: string;
  pair: DashboardPair;
  position: BinanceTrackedPosition;
  protectionOrders: {
    stopLoss: BinancePlacedAlgoOrder | null;
    takeProfit: BinancePlacedAlgoOrder | null;
  };
  stageZone: DashboardPair["entryStages"][number]["zone"];
}

interface PersistCloseExecutionParams {
  account: BinanceAccountInformation;
  closedAt: string;
  closeOrder: BinancePlacedOrder;
  positionAfterClose: BinanceTrackedPosition | null;
  positionBeforeClose: BinanceTrackedPosition;
  symbol: DashboardPair["symbol"];
}

function toNumber(value: string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumericString(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : (0).toFixed(digits);
}

function getCapturedAt(value: string): Date {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getExecutionPrice(params: {
  fallbackMarkPrice: number;
  orderAveragePrice: number;
  positionEntryPrice: number;
}): number {
  if (params.orderAveragePrice > 0) {
    return params.orderAveragePrice;
  }

  if (params.positionEntryPrice > 0) {
    return params.positionEntryPrice;
  }

  return params.fallbackMarkPrice;
}

function getPlanStatus(
  protectionOrders: PersistEntryExecutionParams["protectionOrders"],
): "OPEN" | "PROTECTED" {
  return protectionOrders.stopLoss && protectionOrders.takeProfit
    ? "PROTECTED"
    : "OPEN";
}

function getTrackedPositionSide(
  pair: DashboardPair,
): "FLAT" | "LONG" | "SHORT" {
  if (pair.trendDirection === "BULLISH") {
    return "LONG";
  }

  if (pair.trendDirection === "BEARISH") {
    return "SHORT";
  }

  return "FLAT";
}

function buildAccountSnapshotInsert(
  account: BinanceAccountInformation,
  capturedAt: Date,
) {
  const equity = toNumber(account.totalMarginBalance);
  const grossNotionalUsd = account.positions.reduce(
    (sum, position) => sum + Math.abs(toNumber(position.notional)),
    0,
  );
  const openPositionCount = account.positions.filter(
    (position) =>
      Math.abs(toNumber(position.positionAmt)) > 0 ||
      Math.abs(toNumber(position.notional)) > 0,
  ).length;

  return {
    availableMargin: toNumericString(toNumber(account.availableBalance), 2),
    capturedAt,
    equity: toNumericString(equity, 2),
    exposurePct:
      equity > 0
        ? toNumericString((grossNotionalUsd / equity) * 100, 2)
        : "0.00",
    id: randomUUID(),
    openPositionCount,
    realizedPnl: "0.00",
    unrealizedPnl: toNumericString(toNumber(account.totalUnrealizedProfit), 2),
    usedMargin: toNumericString(toNumber(account.totalInitialMargin), 2),
  };
}

export async function persistEntryExecution(
  params: PersistEntryExecutionParams,
): Promise<void> {
  const db = getDatabaseClient();

  if (!db) {
    return;
  }

  const capturedAt = getCapturedAt(params.overviewGeneratedAt);
  const cycleCapturedAt = getCycleCapturedAt(
    params.overviewGeneratedAt,
    getSignalTimeframe(),
  );
  const stageIndex = params.pair.entryStages.findIndex(
    (stage) => stage.zone === params.stageZone,
  );
  const planStatus = getPlanStatus(params.protectionOrders);
  const signalSide = getTrackedPositionSide(params.pair);

  if (stageIndex === -1 || signalSide === "FLAT") {
    return;
  }

  const executionPrice = getExecutionPrice({
    fallbackMarkPrice: params.position.markPrice,
    orderAveragePrice: params.order.averagePrice,
    positionEntryPrice: params.position.entryPrice,
  });
  const [activePlan] = await db
    .select({
      id: schema.executionPlans.id,
      signalId: schema.executionPlans.signalId,
    })
    .from(schema.executionPlans)
    .where(
      and(
        eq(schema.executionPlans.symbol, params.pair.symbol),
        inArray(schema.executionPlans.status, [...ACTIVE_PLAN_STATUSES]),
      ),
    )
    .orderBy(desc(schema.executionPlans.updatedAt))
    .limit(1);
  const persistedSignal = activePlan
    ? null
    : await persistDashboardPairSignalSnapshot({
        capturedAt: cycleCapturedAt,
        overviewGeneratedAt: params.overviewGeneratedAt,
        overviewReason: params.overviewReason,
        pair: params.pair,
        timeframe: getSignalTimeframe(),
      });

  try {
    await db.transaction(async (tx) => {
      const planId = activePlan?.id ?? randomUUID();
      const signalId = activePlan?.signalId ?? persistedSignal?.signalId;
      const positionId = `position:${planId}`;

      if (!activePlan && !signalId) {
        throw new Error(
          `Signal snapshot was not available for ${params.pair.symbol} execution persistence.`,
        );
      }

      const resolvedSignalId = signalId ?? activePlan?.signalId;

      if (!resolvedSignalId) {
        throw new Error(
          `Signal identifier was not available for ${params.pair.symbol} execution persistence.`,
        );
      }

      if (!activePlan) {
        await tx.insert(schema.executionPlans).values({
          balanceFractionPct: toNumericString(
            params.executionConfig.balanceAllocationPct,
            2,
          ),
          createdAt: capturedAt,
          id: planId,
          leverage: params.executionConfig.leverage,
          side: params.position.side,
          signalId: resolvedSignalId,
          status: planStatus,
          symbol: params.pair.symbol,
          tranchePlan: params.pair.entryStages.map((stage) => ({
            allocationPct: stage.allocationPct,
            plannedPrice: stage.plannedPrice,
            status: stage.status,
            zone: stage.zone,
          })),
          updatedAt: capturedAt,
        });
      } else {
        await tx
          .update(schema.executionPlans)
          .set({
            side: params.position.side,
            status: planStatus,
            tranchePlan: params.pair.entryStages.map((stage) => ({
              allocationPct: stage.allocationPct,
              plannedPrice: stage.plannedPrice,
              status: stage.status,
              zone: stage.zone,
            })),
            updatedAt: capturedAt,
          })
          .where(eq(schema.executionPlans.id, planId));
      }

      await tx
        .insert(schema.positionEntries)
        .values({
          createdAt: capturedAt,
          entryPrice: toNumericString(executionPrice, 4),
          externalOrderId: params.order.orderId,
          id: `entry:${planId}:${stageIndex}`,
          notionalUsd: toNumericString(
            params.order.executedQuantity * executionPrice,
            2,
          ),
          planId,
          quantity: toNumericString(params.order.executedQuantity, 6),
          realizedPnl: null,
          side: params.position.side,
          stageIndex,
          status: planStatus,
          symbol: params.pair.symbol,
        })
        .onConflictDoUpdate({
          set: {
            entryPrice: toNumericString(executionPrice, 4),
            externalOrderId: params.order.orderId,
            notionalUsd: toNumericString(
              params.order.executedQuantity * executionPrice,
              2,
            ),
            quantity: toNumericString(params.order.executedQuantity, 6),
            side: params.position.side,
            status: planStatus,
          },
          target: schema.positionEntries.id,
        });

      await tx
        .insert(schema.positions)
        .values({
          averageEntryPrice: toNumericString(params.position.entryPrice, 4),
          id: positionId,
          markPrice: toNumericString(params.position.markPrice, 4),
          openedAt: capturedAt,
          realizedPnl: "0.00",
          side: params.position.side,
          sizeUsd: toNumericString(params.position.notionalUsd, 2),
          status: planStatus,
          stopLoss: toNumericString(params.pair.stopLoss, 4),
          symbol: params.pair.symbol,
          takeProfitOne: toNumericString(params.pair.takeProfitOne, 4),
          takeProfitTwo: toNumericString(params.pair.takeProfitTwo, 4),
          unrealizedPnl: toNumericString(params.position.unrealizedPnl, 2),
          updatedAt: capturedAt,
        })
        .onConflictDoUpdate({
          set: {
            averageEntryPrice: toNumericString(params.position.entryPrice, 4),
            markPrice: toNumericString(params.position.markPrice, 4),
            realizedPnl: "0.00",
            side: params.position.side,
            sizeUsd: toNumericString(params.position.notionalUsd, 2),
            status: planStatus,
            stopLoss: toNumericString(params.pair.stopLoss, 4),
            takeProfitOne: toNumericString(params.pair.takeProfitOne, 4),
            takeProfitTwo: toNumericString(params.pair.takeProfitTwo, 4),
            unrealizedPnl: toNumericString(params.position.unrealizedPnl, 2),
            updatedAt: capturedAt,
          },
          target: schema.positions.id,
        });

      await tx
        .insert(schema.accountSnapshots)
        .values(buildAccountSnapshotInsert(params.account, capturedAt));
    });
  } catch (error) {
    logger.error("Failed to persist TrendX entry execution", {
      error: error instanceof Error ? error.message : String(error),
      symbol: params.pair.symbol,
    });
  }
}

export async function persistCloseExecution(
  params: PersistCloseExecutionParams,
): Promise<void> {
  const db = getDatabaseClient();

  if (!db) {
    return;
  }

  const closedAt = getCapturedAt(params.closedAt);
  const closeStatus = params.positionAfterClose ? "OPEN" : "CLOSED";

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.accountSnapshots)
        .values(buildAccountSnapshotInsert(params.account, closedAt));

      const [activePlan] = await tx
        .select({
          id: schema.executionPlans.id,
        })
        .from(schema.executionPlans)
        .where(
          and(
            eq(schema.executionPlans.symbol, params.symbol),
            inArray(schema.executionPlans.status, [...ACTIVE_PLAN_STATUSES]),
          ),
        )
        .orderBy(desc(schema.executionPlans.updatedAt))
        .limit(1);

      if (!activePlan) {
        return;
      }

      const positionId = `position:${activePlan.id}`;

      await tx
        .update(schema.executionPlans)
        .set({
          status: closeStatus,
          updatedAt: closedAt,
        })
        .where(eq(schema.executionPlans.id, activePlan.id));

      await tx
        .update(schema.positionEntries)
        .set({
          status: closeStatus,
        })
        .where(eq(schema.positionEntries.planId, activePlan.id));

      await tx
        .update(schema.positions)
        .set({
          markPrice: toNumericString(
            params.positionAfterClose?.markPrice ??
              getExecutionPrice({
                fallbackMarkPrice: params.positionBeforeClose.markPrice,
                orderAveragePrice: params.closeOrder.averagePrice,
                positionEntryPrice: params.positionBeforeClose.entryPrice,
              }),
            4,
          ),
          realizedPnl: "0.00",
          side: params.positionAfterClose?.side ?? "FLAT",
          sizeUsd: toNumericString(
            params.positionAfterClose?.notionalUsd ?? 0,
            2,
          ),
          status: closeStatus,
          unrealizedPnl: toNumericString(
            params.positionAfterClose?.unrealizedPnl ?? 0,
            2,
          ),
          updatedAt: closedAt,
        })
        .where(eq(schema.positions.id, positionId));
    });
  } catch (error) {
    logger.error("Failed to persist TrendX close execution", {
      error: error instanceof Error ? error.message : String(error),
      symbol: params.symbol,
    });
  }
}
