import { ORPCError, os } from "@orpc/server";

import { getApiSession } from "../lib/auth";
import type { ApiContext } from "./context";

export const publicProcedure = os.$context<ApiContext>();

export const protectedProcedure = publicProcedure.use(
  async ({ context, next }) => {
    const session = await getApiSession(context.headers);

    if (!session) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "TrendX session is required.",
      });
    }

    return await next();
  },
);
