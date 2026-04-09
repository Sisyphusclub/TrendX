import { protectedProcedure } from "../../../orpc/procedures";

import { executeNextEntryStage } from "../lib/execute-testnet-order";
import {
  type ExecutionMutationOutput,
  executeNextStageInputSchema,
  executionMutationOutputSchema,
} from "../types";

export const executeNextStage = protectedProcedure
  .route({
    method: "POST",
    path: "/execution/next-stage",
    summary: "Execute the next triggered entry stage on Binance testnet",
    tags: ["Execution"],
  })
  .input(executeNextStageInputSchema)
  .output(executionMutationOutputSchema)
  .handler(async ({ input }): Promise<ExecutionMutationOutput> => {
    return await executeNextEntryStage(input);
  });
