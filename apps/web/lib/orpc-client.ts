import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

import type { ApiRouterClient } from "@trendx/api";

function getRpcUrl(): string {
  if (typeof window !== "undefined") {
    return new URL("/api/rpc", window.location.origin).toString();
  }

  return "http://127.0.0.1:3000/api/rpc";
}

const link = new RPCLink({
  url: getRpcUrl(),
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
