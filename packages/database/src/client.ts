import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./drizzle/schema";

export function createDatabaseClient(
  connectionString: string,
): NodePgDatabase<typeof schema> {
  const pool = new Pool({
    connectionString,
  });

  return drizzle({
    client: pool,
    schema,
  });
}

export type TrendXDatabase = ReturnType<typeof createDatabaseClient>;
