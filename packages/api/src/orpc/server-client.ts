import { createRouterClient } from "@orpc/server";

import { type CreateApiContextInput, createApiContext } from "./context";
import { type ApiRouterClient, router } from "./router";

export function createServerApiClient(
  input: CreateApiContextInput = {},
): ApiRouterClient {
  return createRouterClient(router, {
    context: async () => createApiContext(input),
  });
}
