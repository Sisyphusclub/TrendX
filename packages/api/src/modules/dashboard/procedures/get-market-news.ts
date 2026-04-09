import { protectedProcedure } from "../../../orpc/procedures";

import { buildDashboardMarketNews } from "../lib/build-market-news";
import {
  type GetDashboardMarketNewsOutput,
  getDashboardMarketNewsInputSchema,
  getDashboardMarketNewsOutputSchema,
} from "../types";

export const getMarketNews = protectedProcedure
  .route({
    method: "GET",
    path: "/dashboard/market-news",
    summary: "Get TrendX market news",
    tags: ["Dashboard"],
  })
  .input(getDashboardMarketNewsInputSchema)
  .output(getDashboardMarketNewsOutputSchema)
  .handler(async (): Promise<GetDashboardMarketNewsOutput> => {
    return await buildDashboardMarketNews();
  });
