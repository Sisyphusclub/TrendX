import { protectedProcedure } from "../../../orpc/procedures";

import { closeTrackedPosition } from "../lib/execute-testnet-order";
import {
  closePositionInputSchema,
  type ExecutionMutationOutput,
  executionMutationOutputSchema,
} from "../types";

export const closePosition = protectedProcedure
  .route({
    method: "POST",
    path: "/execution/close-position",
    summary: "Close the tracked Binance testnet position at market",
    tags: ["Execution"],
  })
  .input(closePositionInputSchema)
  .output(executionMutationOutputSchema)
  .handler(async ({ input }): Promise<ExecutionMutationOutput> => {
    return await closeTrackedPosition(input);
  });
