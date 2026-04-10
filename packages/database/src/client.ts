import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./drizzle/schema";

const DATABASE_CONNECTION_TIMEOUT_MS = 1500;

export function createDatabaseClient(
  connectionString: string,
): NodePgDatabase<typeof schema> {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
  });

  return drizzle({
    client: pool,
    schema,
  });
}

export type TrendXDatabase = ReturnType<typeof createDatabaseClient>;
