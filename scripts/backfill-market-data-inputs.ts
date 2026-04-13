import { randomUUID } from "node:crypto";
import { loadWorkspaceEnv } from "./load-workspace-env";

function toJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

loadWorkspaceEnv();

(async () => {
  if (process.argv.includes("--help")) {
    console.log(
      "Usage: pnpm market-data:backfill\n\nBackfill market_data_inputs from legacy market_snapshots.raw_payload.marketDataSnapshot rows.",
    );
    return;
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required to backfill market_data_inputs.");
  }

  const { createDatabaseClient, schema } = await import("@trendx/database");
  const db = createDatabaseClient(process.env.DATABASE_URL.trim());

  const snapshots = await db
    .select({
      capturedAt: schema.marketSnapshots.capturedAt,
      rawPayload: schema.marketSnapshots.rawPayload,
      symbol: schema.marketSnapshots.symbol,
      timeframe: schema.marketSnapshots.timeframe,
    })
    .from(schema.marketSnapshots);

  let backfilled = 0;
  let skipped = 0;

  for (const snapshot of snapshots) {
    const rawPayload = toJsonObject(snapshot.rawPayload);

    if (!rawPayload) {
      skipped += 1;
      continue;
    }

    const marketDataSnapshot = toJsonObject(rawPayload.marketDataSnapshot);

    if (!marketDataSnapshot) {
      skipped += 1;
      continue;
    }

    const marketDataFeed = toJsonObject(rawPayload.marketDataFeed) ?? {
      mode: "live",
      note: "Backfilled from legacy marketSnapshots raw payload.",
      source: "database",
      symbol: snapshot.symbol,
    };
    const providerSource =
      typeof marketDataFeed.source === "string"
        ? marketDataFeed.source
        : "database";
    const updatedAt = new Date();

    await db
      .insert(schema.marketDataInputs)
      .values({
        capturedAt: snapshot.capturedAt,
        feed: marketDataFeed,
        id: randomUUID(),
        providerSource,
        snapshot: marketDataSnapshot,
        symbol: snapshot.symbol,
        timeframe: snapshot.timeframe,
        updatedAt,
      })
      .onConflictDoUpdate({
        set: {
          feed: marketDataFeed,
          providerSource,
          snapshot: marketDataSnapshot,
          updatedAt,
        },
        target: [
          schema.marketDataInputs.symbol,
          schema.marketDataInputs.timeframe,
          schema.marketDataInputs.capturedAt,
        ],
      });

    backfilled += 1;
  }

  console.log(
    JSON.stringify(
      {
        backfilled,
        skipped,
        total: snapshots.length,
      },
      null,
      2,
    ),
  );
})();
