import { z } from "zod";

export const trackedSymbolSchema = z.enum(["BTCUSDT", "ETHUSDT"]);
export const trendDirectionSchema = z.enum(["BULLISH", "BEARISH", "NEUTRAL"]);
export const signalActionSchema = z.enum(["ENTRY", "EXIT", "WAIT"]);
export const executionStatusSchema = z.enum([
  "PENDING",
  "ARMED",
  "OPEN",
  "PROTECTED",
  "HALTED",
]);
export const positionSideSchema = z.enum(["LONG", "SHORT", "FLAT"]);
export const confirmationKeySchema = z.enum([
  "oi",
  "cvd",
  "funding",
  "largeOrders",
  "liquidationSweep",
  "aggressiveFlow",
]);

export const getDashboardOverviewInputSchema = z.object({});

export const confirmationItemSchema = z.object({
  key: confirmationKeySchema,
  label: z.string().min(1),
  matched: z.boolean(),
});

export const orderBlockSchema = z.object({
  high: z.number(),
  low: z.number(),
  mid: z.number(),
});

export const entryStageSchema = z.object({
  allocationPct: z.number(),
  plannedPrice: z.number(),
  zone: z.enum(["upper", "mid", "lower"]),
});

export const currentPositionSchema = z.object({
  leverage: z.number(),
  pnl: z.number(),
  side: positionSideSchema,
  sizeUsd: z.number(),
});

export const dashboardPairSchema = z.object({
  action: signalActionSchema,
  confirmationCount: z.number().int().nonnegative(),
  confirmationThreshold: z.number().int().positive(),
  currentPosition: currentPositionSchema,
  cvdBiasPct: z.number(),
  executionStatus: executionStatusSchema,
  fundingRate: z.number(),
  lastPrice: z.number(),
  markPrice: z.number(),
  openInterestDeltaPct: z.number(),
  orderBlock: orderBlockSchema,
  rationale: z.string().min(1),
  riskLabel: z.string().min(1),
  stopLoss: z.number(),
  symbol: trackedSymbolSchema,
  takeProfitOne: z.number(),
  takeProfitTwo: z.number(),
  trendDirection: trendDirectionSchema,
  checklist: z.array(confirmationItemSchema).length(6),
  entryStages: z.array(entryStageSchema).length(3),
});

export const accountRiskSchema = z.object({
  availableMargin: z.number(),
  dailyPnl: z.number(),
  equity: z.number(),
  exposurePct: z.number(),
  openPositionCount: z.number().int().nonnegative(),
  usedMargin: z.number(),
});

export const dashboardOverviewSchema = z.object({
  accountRisk: accountRiskSchema,
  cadenceMinutes: z.number().positive(),
  generatedAt: z.string().datetime(),
  killSwitchEnabled: z.boolean(),
  operatorMode: z.literal("AUTOMATED"),
  pairs: z.array(dashboardPairSchema).length(2),
});

export const getDashboardOverviewOutputSchema = z.object({
  overview: dashboardOverviewSchema,
  reason: z.string().min(1),
  success: z.boolean(),
});

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
export type DashboardPair = z.infer<typeof dashboardPairSchema>;
export type GetDashboardOverviewOutput = z.infer<
  typeof getDashboardOverviewOutputSchema
>;
