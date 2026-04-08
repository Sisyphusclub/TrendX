import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { router } from "@trendx/api";
import { createApiContext } from "@trendx/api/orpc/context";
import { logger } from "@trendx/logs";

export const runtime = "nodejs";

const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));

      logger.error("oRPC request failed", {
        message: normalizedError.message,
        name: normalizedError.name,
      });
    }),
  ],
});

async function handleRequest(request: Request): Promise<Response> {
  const { response } = await rpcHandler.handle(request, {
    context: await createApiContext({
      headers: request.headers,
    }),
    prefix: "/api/rpc",
  });

  return response ?? new Response("Not Found", { status: 404 });
}

export const GET = handleRequest;
export const HEAD = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
