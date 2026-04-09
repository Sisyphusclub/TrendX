import { getExecutionHistory } from "./procedures/get-execution-history";
import { getMarketNews } from "./procedures/get-market-news";
import { getOverview } from "./procedures/get-overview";

export const dashboardRouter = {
  getExecutionHistory,
  getMarketNews,
  getOverview,
};
