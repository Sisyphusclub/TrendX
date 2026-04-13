import { z } from "zod";

export const trackedSymbolSchema = z.enum(["BTCUSDT", "ETHUSDT"]);
export const trendDirectionSchema = z.enum(["BULLISH", "BEARISH", "NEUTRAL"]);
export const orderBlockDirectionSchema = z.enum(["BULLISH", "BEARISH"]);
export const signalActionSchema = z.enum(["ENTRY", "EXIT", "WAIT"]);
export const executionStatusSchema = z.enum([
  "PENDING",
  "ARMED",
  "OPEN",
  "PROTECTED",
  "HALTED",
]);
export const positionSideSchema = z.enum(["LONG", "SHORT", "FLAT"]);
export const entryStageStatusSchema = z.enum([
  "LOCKED",
  "WAITING",
  "NEXT",
  "TRIGGERED",
]);
export const confirmationKeySchema = z.enum([
  "oi",
  "cvd",
  "funding",
  "largeOrders",
  "liquidationSweep",
  "aggressiveFlow",
]);

export const getDashboardOverviewInputSchema = z.object({});
export const getDashboardMarketNewsInputSchema = z.object({});
export const getDashboardExecutionHistoryInputSchema = z.object({});

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
  status: entryStageStatusSchema,
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
  mainOrderBlock: orderBlockSchema,
  mainOrderBlockDirection: orderBlockDirectionSchema,
  markPrice: z.number(),
  openInterestDeltaPct: z.number(),
  orderBlock: orderBlockSchema,
  previousOppositeOrderBlock: orderBlockSchema.nullable(),
  previousOppositeOrderBlockDirection: orderBlockDirectionSchema.nullable(),
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

export const dashboardExecutionConfigSchema = z.object({
  balanceAllocationPct: z.number().positive(),
  confirmationThreshold: z.number().int().positive(),
  hardRisk: z.object({
    cooldownMinutesAfterClose: z.number().int().nonnegative(),
    maxDailyLossPct: z.number().positive(),
    maxExposurePct: z.number().positive(),
    requireCurrentSignalCycle: z.boolean(),
  }),
  leverage: z.number().positive(),
  stageAllocations: z.array(z.number().positive()).length(3),
});

export const marketNewsCategorySchema = z.enum(["FLASH", "NEWS"]);
export const marketNewsModeSchema = z.enum(["live", "mixed", "fallback"]);
export const dashboardFeedModeSchema = z.enum(["live", "mixed", "fallback"]);
export const dashboardFeedPairModeSchema = z.enum(["live", "fallback"]);
export const dashboardFeedMarketSourceSchema = z.enum([
  "coinank",
  "database",
  "mixed",
  "seeded",
]);
export const dashboardFeedAccountRiskModeSchema = z.enum(["live", "reference"]);
export const dashboardFeedAccountRiskSourceSchema = z.enum([
  "binance",
  "reference",
]);
export const dashboardFeedPairSourceSchema = z.enum([
  "coinank",
  "database",
  "seeded",
]);
export const executionHistoryItemTypeSchema = z.enum([
  "CLOSE",
  "ENTRY",
  "PROTECTION",
]);
export const executionHistoryToneSchema = z.enum([
  "bear",
  "blue",
  "bull",
  "muted",
]);

export const marketNewsItemSchema = z.object({
  category: marketNewsCategorySchema,
  id: z.string().min(1),
  isImportant: z.boolean(),
  publishedAt: z.string().datetime(),
  readCount: z.number().int().nonnegative(),
  source: z.string().min(1),
  summary: z.string().min(1),
  title: z.string().min(1),
});

export const dashboardMarketNewsSchema = z.object({
  flashes: z.array(marketNewsItemSchema).min(1),
  generatedAt: z.string().datetime(),
  headlines: z.array(marketNewsItemSchema).min(1),
  mode: marketNewsModeSchema,
});

export const dashboardExecutionHistoryItemSchema = z.object({
  detail: z.string().min(1),
  happenedAt: z.string().datetime(),
  id: z.string().min(1),
  label: z.string().min(1),
  symbol: trackedSymbolSchema,
  tone: executionHistoryToneSchema,
  type: executionHistoryItemTypeSchema,
});

export const dashboardExecutionHistorySchema = z.object({
  generatedAt: z.string().datetime(),
  items: z.array(dashboardExecutionHistoryItemSchema),
});

export const dashboardOverviewSchema = z.object({
  accountRisk: accountRiskSchema,
  cadenceMinutes: z.number().positive(),
  executionConfig: dashboardExecutionConfigSchema,
  generatedAt: z.string().datetime(),
  killSwitchEnabled: z.boolean(),
  operatorMode: z.literal("AUTOMATED"),
  pairs: z.array(dashboardPairSchema).length(2),
});

export const dashboardPairFeedSchema = z.object({
  capturedAt: z.string().datetime().nullable(),
  mode: dashboardFeedPairModeSchema,
  note: z.string().min(1),
  source: dashboardFeedPairSourceSchema,
  symbol: trackedSymbolSchema,
});

export const dashboardOverviewFeedSchema = z.object({
  accountRiskMode: dashboardFeedAccountRiskModeSchema,
  accountRiskSource: dashboardFeedAccountRiskSourceSchema,
  marketDataMode: dashboardFeedModeSchema,
  marketDataSource: dashboardFeedMarketSourceSchema,
  notes: z.array(z.string().min(1)).min(1),
  pairs: z.array(dashboardPairFeedSchema).length(2),
});

export const getDashboardOverviewOutputSchema = z.object({
  feed: dashboardOverviewFeedSchema,
  overview: dashboardOverviewSchema,
  reason: z.string().min(1),
  success: z.boolean(),
});

export const getDashboardMarketNewsOutputSchema = z.object({
  marketNews: dashboardMarketNewsSchema,
  reason: z.string().min(1),
  success: z.boolean(),
});

export const getDashboardExecutionHistoryOutputSchema = z.object({
  executionHistory: dashboardExecutionHistorySchema,
  reason: z.string().min(1),
  success: z.boolean(),
});

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
export type DashboardOverviewFeed = z.infer<typeof dashboardOverviewFeedSchema>;
export type DashboardExecutionConfig = z.infer<
  typeof dashboardExecutionConfigSchema
>;
export type DashboardPair = z.infer<typeof dashboardPairSchema>;
export type DashboardMarketNews = z.infer<typeof dashboardMarketNewsSchema>;
export type DashboardExecutionHistory = z.infer<
  typeof dashboardExecutionHistorySchema
>;
export type DashboardExecutionHistoryItem = z.infer<
  typeof dashboardExecutionHistoryItemSchema
>;
export type GetDashboardOverviewOutput = z.infer<
  typeof getDashboardOverviewOutputSchema
>;
export type GetDashboardMarketNewsOutput = z.infer<
  typeof getDashboardMarketNewsOutputSchema
>;
export type GetDashboardExecutionHistoryOutput = z.infer<
  typeof getDashboardExecutionHistoryOutputSchema
>;
export type MarketNewsItem = z.infer<typeof marketNewsItemSchema>;
