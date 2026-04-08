import { os } from "@orpc/server";

import type { ApiContext } from "./context";

export const publicProcedure = os.$context<ApiContext>();
