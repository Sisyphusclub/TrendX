import type { RouterClient } from "@orpc/server";

import { dashboardRouter } from "../modules/dashboard/router";

import { publicProcedure } from "./procedures";

export const router = publicProcedure.router({
  dashboard: dashboardRouter,
});

export type ApiRouter = typeof router;
export type ApiRouterClient = RouterClient<typeof router>;
