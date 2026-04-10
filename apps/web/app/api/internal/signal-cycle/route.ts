import { timingSafeEqual } from "node:crypto";

import { runDashboardSignalCycle } from "@trendx/api/modules/dashboard/lib/run-signal-cycle";
import { logger } from "@trendx/logs";

export const runtime = "nodejs";

function getConfiguredSecret(): string {
  return process.env.TRENDX_SIGNAL_CYCLE_SECRET?.trim() ?? "";
}

function getProvidedSecret(request: Request): string {
  const authorizationHeader = request.headers.get("authorization");

  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-trendx-signal-cycle-secret")?.trim() ?? "";
}

function matchesSecret(expected: string, provided: string): boolean {
  if (!expected || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: Request): Promise<Response> {
  const configuredSecret = getConfiguredSecret();

  if (!configuredSecret) {
    return Response.json(
      {
        reason:
          "TRENDX_SIGNAL_CYCLE_SECRET is required before the internal signal cycle route can run.",
        success: false,
      },
      {
        status: 503,
      },
    );
  }

  if (!matchesSecret(configuredSecret, getProvidedSecret(request))) {
    return Response.json(
      {
        reason: "Unauthorized signal cycle request.",
        success: false,
      },
      {
        status: 401,
      },
    );
  }

  try {
    const result = await runDashboardSignalCycle();

    return Response.json(result, {
      status: 200,
    });
  } catch (error) {
    logger.error("TrendX signal cycle failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      {
        reason:
          error instanceof Error
            ? error.message
            : "Signal cycle execution failed.",
        success: false,
      },
      {
        status: 500,
      },
    );
  }
}
