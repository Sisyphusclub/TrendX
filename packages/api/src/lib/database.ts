import { createDatabaseClient, type TrendXDatabase } from "@trendx/database";
import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
});

let databaseClient: TrendXDatabase | null | undefined;

export function getDatabaseClient(): TrendXDatabase | null {
  if (databaseClient !== undefined) {
    return databaseClient;
  }

  const databaseUrl = databaseEnvSchema.parse(process.env).DATABASE_URL?.trim();

  if (!databaseUrl) {
    databaseClient = null;

    return databaseClient;
  }

  databaseClient = createDatabaseClient(databaseUrl);

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
