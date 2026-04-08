import { publicProcedure } from "../../../orpc/procedures";

import { buildDashboardOverview } from "../lib/build-overview";
import {
  type GetDashboardOverviewOutput,
  getDashboardOverviewInputSchema,
  getDashboardOverviewOutputSchema,
} from "../types";

export const getOverview = publicProcedure
  .route({
    method: "GET",
    path: "/dashboard/overview",
    summary: "Get TrendX dashboard overview",
    tags: ["Dashboard"],
  })
  .input(getDashboardOverviewInputSchema)
  .output(getDashboardOverviewOutputSchema)
  .handler(async (): Promise<GetDashboardOverviewOutput> => {
    return await buildDashboardOverview();
  });
