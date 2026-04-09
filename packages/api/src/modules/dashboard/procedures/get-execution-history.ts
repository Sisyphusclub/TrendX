import { protectedProcedure } from "../../../orpc/procedures";

import { buildExecutionHistory } from "../lib/build-execution-history";
import {
  type GetDashboardExecutionHistoryOutput,
  getDashboardExecutionHistoryInputSchema,
  getDashboardExecutionHistoryOutputSchema,
} from "../types";

export const getExecutionHistory = protectedProcedure
  .route({
    method: "GET",
    path: "/dashboard/execution-history",
    summary: "Get TrendX execution history",
    tags: ["Dashboard"],
  })
  .input(getDashboardExecutionHistoryInputSchema)
  .output(getDashboardExecutionHistoryOutputSchema)
  .handler(async (): Promise<GetDashboardExecutionHistoryOutput> => {
    return await buildExecutionHistory();
  });
