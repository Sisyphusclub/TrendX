import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

import type { ApiRouterClient } from "@trendx/api";

const link = new RPCLink({
  url: "/api/rpc",
  interceptors: [
    onError((error) => {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      console.error(error);
    }),
  ],
});

export const orpcClient: ApiRouterClient = createORPCClient(link);
