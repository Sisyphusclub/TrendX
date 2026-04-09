import { z } from "zod";

import { trackedSymbolSchema } from "../dashboard/types";

export const binanceOrderSideSchema = z.enum(["BUY", "SELL"]);
export const executionMutationActionSchema = z.enum([
  "CLOSE_POSITION",
  "ENTRY_STAGE",
]);

export const executeNextStageInputSchema = z.object({
  symbol: trackedSymbolSchema,
});

export const closePositionInputSchema = z.object({
  symbol: trackedSymbolSchema,
});

export const executionMutationOrderSchema = z.object({
  action: executionMutationActionSchema,
  averagePrice: z.number(),
  executedQty: z.number(),
  markPrice: z.number(),
  notionalUsd: z.number(),
  orderId: z.string().min(1),
  side: binanceOrderSideSchema,
  stageZone: z.enum(["upper", "mid", "lower"]).nullable(),
});

export const executionProtectionOrderSchema = z.object({
  algoId: z.string().min(1),
  clientAlgoId: z.string().min(1),
  side: binanceOrderSideSchema,
  triggerPrice: z.number(),
  type: z.enum(["STOP_MARKET", "TAKE_PROFIT_MARKET"]),
});

export const executionProtectionOrdersSchema = z.object({
  stopLoss: executionProtectionOrderSchema.nullable(),
  takeProfit: executionProtectionOrderSchema.nullable(),
});

export const executionMutationOutputSchema = z.object({
  order: executionMutationOrderSchema.nullable(),
  protectionOrders: executionProtectionOrdersSchema.nullable(),
  reason: z.string().min(1),
  success: z.boolean(),
  symbol: trackedSymbolSchema,
  testnet: z.boolean(),
});

export type ClosePositionInput = z.infer<typeof closePositionInputSchema>;
export type ExecuteNextStageInput = z.infer<typeof executeNextStageInputSchema>;
export type ExecutionMutationOutput = z.infer<
  typeof executionMutationOutputSchema
>;
