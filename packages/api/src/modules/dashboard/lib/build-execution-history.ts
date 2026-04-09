import { schema } from "@trendx/database";
import { desc, inArray } from "@trendx/database/drizzle/operators";
import { logger } from "@trendx/logs";

import { getDatabaseClient } from "../../../lib/database";
import {
  type DashboardExecutionHistoryItem,
  type GetDashboardExecutionHistoryOutput,
  getDashboardExecutionHistoryOutputSchema,
} from "../types";

const trackedSymbols = ["BTCUSDT", "ETHUSDT"] as const;

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatQuantity(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  });
}

function formatStageLabel(stageIndex: number): string {
  if (stageIndex === 0) {
    return "上沿";
  }

  if (stageIndex === 1) {
    return "中段";
  }

  if (stageIndex === 2) {
    return "下沿";
  }

  return `第 ${stageIndex + 1} 档`;
}

function formatSideLabel(side: "FLAT" | "LONG" | "SHORT"): string {
  if (side === "LONG") {
    return "做多";
  }

  if (side === "SHORT") {
    return "做空";
  }

  return "空仓";
}

function toNumber(value: string): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toTrackedSymbol(
  value: string,
): DashboardExecutionHistoryItem["symbol"] | null {
  return trackedSymbols.find((symbol) => symbol === value) ?? null;
}

function getEntryTone(
  side: "FLAT" | "LONG" | "SHORT",
): DashboardExecutionHistoryItem["tone"] {
  if (side === "LONG") {
    return "bull";
  }

  if (side === "SHORT") {
    return "bear";
  }

  return "muted";
}

export async function buildExecutionHistory(): Promise<GetDashboardExecutionHistoryOutput> {
  const db = getDatabaseClient();

  if (!db) {
    return getDashboardExecutionHistoryOutputSchema.parse({
      executionHistory: {
        generatedAt: new Date().toISOString(),
        items: [],
      },
      reason:
        "Execution history is unavailable until PostgreSQL is configured.",
      success: true,
    });
  }

  try {
    const plans = await db
      .select({
        createdAt: schema.executionPlans.createdAt,
        id: schema.executionPlans.id,
        side: schema.executionPlans.side,
        status: schema.executionPlans.status,
        symbol: schema.executionPlans.symbol,
        updatedAt: schema.executionPlans.updatedAt,
      })
      .from(schema.executionPlans)
      .where(inArray(schema.executionPlans.symbol, [...trackedSymbols]))
      .orderBy(desc(schema.executionPlans.updatedAt))
      .limit(8);

    if (!plans.length) {
      return getDashboardExecutionHistoryOutputSchema.parse({
        executionHistory: {
          generatedAt: new Date().toISOString(),
          items: [],
        },
        reason: "No persisted execution history is available yet.",
        success: true,
      });
    }

    const planIds = plans.map((plan) => plan.id);
    const positionIds = plans.map((plan) => `position:${plan.id}`);
    const [entries, positions] = await Promise.all([
      db
        .select({
          createdAt: schema.positionEntries.createdAt,
          entryPrice: schema.positionEntries.entryPrice,
          externalOrderId: schema.positionEntries.externalOrderId,
          id: schema.positionEntries.id,
          notionalUsd: schema.positionEntries.notionalUsd,
          planId: schema.positionEntries.planId,
          quantity: schema.positionEntries.quantity,
          side: schema.positionEntries.side,
          stageIndex: schema.positionEntries.stageIndex,
          symbol: schema.positionEntries.symbol,
        })
        .from(schema.positionEntries)
        .where(inArray(schema.positionEntries.planId, planIds))
        .orderBy(desc(schema.positionEntries.createdAt)),
      db
        .select({
          id: schema.positions.id,
          markPrice: schema.positions.markPrice,
          side: schema.positions.side,
          status: schema.positions.status,
          stopLoss: schema.positions.stopLoss,
          symbol: schema.positions.symbol,
          takeProfitOne: schema.positions.takeProfitOne,
        })
        .from(schema.positions)
        .where(inArray(schema.positions.id, positionIds)),
    ]);
    const entriesByPlanId = new Map<string, typeof entries>();

    for (const entry of entries) {
      const existingEntries = entriesByPlanId.get(entry.planId) ?? [];

      existingEntries.push(entry);
      entriesByPlanId.set(entry.planId, existingEntries);
    }

    const positionsByPlanId = new Map(
      positions.map((position) => [
        position.id.replace(/^position:/, ""),
        position,
      ]),
    );
    const items = plans
      .flatMap((plan) => {
        const planEntries = entriesByPlanId.get(plan.id) ?? [];
        const planPosition = positionsByPlanId.get(plan.id);
        const planItems: DashboardExecutionHistoryItem[] = planEntries
          .map((entry) => ({
            detail: `${formatSideLabel(entry.side)} ${formatUsd(toNumber(entry.notionalUsd))} / 成交 ${formatUsd(toNumber(entry.entryPrice))} / 数量 ${formatQuantity(toNumber(entry.quantity))}${entry.externalOrderId ? ` / ${entry.externalOrderId}` : ""}`,
            happenedAt: entry.createdAt.toISOString(),
            id: entry.id,
            label: `${entry.symbol} ${formatStageLabel(entry.stageIndex)}建仓`,
            symbol: entry.symbol,
            tone: getEntryTone(entry.side),
            type: "ENTRY" as const,
          }))
          .flatMap((item) => {
            const symbol = toTrackedSymbol(item.symbol);

            if (!symbol) {
              return [];
            }

            return [{ ...item, symbol }];
          });
        const planSymbol = toTrackedSymbol(plan.symbol);

        if (
          planSymbol &&
          planPosition &&
          (plan.status === "OPEN" || plan.status === "PROTECTED")
        ) {
          planItems.push({
            detail: `止损 ${formatUsd(toNumber(planPosition.stopLoss))} / 止盈 ${formatUsd(toNumber(planPosition.takeProfitOne))}`,
            happenedAt: plan.updatedAt.toISOString(),
            id: `protection:${plan.id}`,
            label: `${plan.symbol} 保护单`,
            symbol: planSymbol,
            tone: "blue",
            type: "PROTECTION" as const,
          });
        }

        if (planSymbol && plan.status === "CLOSED") {
          planItems.push({
            detail: `计划已关闭 / 最新标记 ${formatUsd(toNumber(planPosition?.markPrice ?? "0"))}`,
            happenedAt: plan.updatedAt.toISOString(),
            id: `close:${plan.id}`,
            label: `${plan.symbol} 平仓完成`,
            symbol: planSymbol,
            tone: "muted",
            type: "CLOSE" as const,
          });
        }

        return planItems;
      })
      .sort(
        (left, right) =>
          new Date(right.happenedAt).getTime() -
          new Date(left.happenedAt).getTime(),
      )
      .slice(0, 10);

    return getDashboardExecutionHistoryOutputSchema.parse({
      executionHistory: {
        generatedAt: new Date().toISOString(),
        items,
      },
      reason: "Execution history loaded from PostgreSQL.",
      success: true,
    });
  } catch (error) {
    logger.warn("Failed to read TrendX execution history", {
      error: error instanceof Error ? error.message : String(error),
    });

    return getDashboardExecutionHistoryOutputSchema.parse({
      executionHistory: {
        generatedAt: new Date().toISOString(),
        items: [],
      },
      reason: "Execution history read failed.",
      success: true,
    });
  }
}
