import { createDatabaseClient, type TrendXDatabase } from "@trendx/database";
import { z } from "zod";

const databaseEnvSchema = z.object({
  TRENDX_DATABASE_CONNECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(60_000)
    .default(5_000),
  DATABASE_URL: z.string().min(1).optional(),
});

let databaseClient: TrendXDatabase | null | undefined;

export function getDatabaseClient(): TrendXDatabase | null {
  if (databaseClient !== undefined) {
    return databaseClient;
  }

  const env = databaseEnvSchema.parse(process.env);
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    databaseClient = null;

    return databaseClient;
  }

  databaseClient = createDatabaseClient(databaseUrl, {
    connectionTimeoutMs: env.TRENDX_DATABASE_CONNECTION_TIMEOUT_MS,
  });

  return databaseClient;
}

export function getRequiredDatabaseClient(): TrendXDatabase {
  const client = getDatabaseClient();

  if (!client) {
    throw new Error(
      "DATABASE_URL is required for TrendX authentication and persistence features.",
    );
  }

  return client;
}
