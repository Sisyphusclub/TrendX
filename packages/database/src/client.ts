import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./drizzle/schema";

const DEFAULT_DATABASE_CONNECTION_TIMEOUT_MS = 5_000;

export function createDatabaseClient(
  connectionString: string,
  options?: {
    connectionTimeoutMs?: number;
  },
): NodePgDatabase<typeof schema> {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis:
      options?.connectionTimeoutMs ?? DEFAULT_DATABASE_CONNECTION_TIMEOUT_MS,
  });

  return drizzle({
    client: pool,
    schema,
  });
}

export type TrendXDatabase = ReturnType<typeof createDatabaseClient>;
