import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const trendDirectionEnum = pgEnum("trend_direction", [
  "BULLISH",
  "BEARISH",
  "NEUTRAL",
]);

export const signalActionEnum = pgEnum("signal_action", [
  "ENTRY",
  "EXIT",
  "WAIT",
]);

export const orderSideEnum = pgEnum("order_side", ["LONG", "SHORT", "FLAT"]);

export const executionStatusEnum = pgEnum("execution_status", [
  "PENDING",
  "ARMED",
  "OPEN",
  "PROTECTED",
  "CLOSED",
  "FAILED",
  "HALTED",
]);

export const accountSnapshots = pgTable(
  "account_snapshots",
  {
    id: text("id").primaryKey(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    equity: numeric("equity", { precision: 18, scale: 2 }).notNull(),
    usedMargin: numeric("used_margin", { precision: 18, scale: 2 }).notNull(),
    availableMargin: numeric("available_margin", {
      precision: 18,
      scale: 2,
    }).notNull(),
    exposurePct: numeric("exposure_pct", { precision: 8, scale: 2 }).notNull(),
    unrealizedPnl: numeric("unrealized_pnl", {
      precision: 18,
      scale: 2,
    }).notNull(),
    realizedPnl: numeric("realized_pnl", { precision: 18, scale: 2 }).notNull(),
    openPositionCount: integer("open_position_count").notNull(),
  },
  (table) => ({
    capturedAtIndex: index("account_snapshots_captured_at_idx").on(
      table.capturedAt,
    ),
  }),
);

export const marketSnapshots = pgTable(
  "market_snapshots",
  {
    id: text("id").primaryKey(),
    symbol: varchar("symbol", { length: 16 }).notNull(),
    timeframe: varchar("timeframe", { length: 8 }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    lastPrice: numeric("last_price", { precision: 18, scale: 4 }).notNull(),
    openInterestDeltaPct: numeric("open_interest_delta_pct", {
      precision: 8,
      scale: 2,
    }).notNull(),
    cvdBiasPct: numeric("cvd_bias_pct", { precision: 8, scale: 2 }).notNull(),
    fundingRate: numeric("funding_rate", { precision: 8, scale: 4 }).notNull(),
    largeOrderScore: numeric("large_order_score", {
      precision: 8,
      scale: 2,
    }).notNull(),
    liquidationSweepScore: numeric("liquidation_sweep_score", {
      precision: 8,
      scale: 2,
    }).notNull(),
    aggressiveFlowScore: numeric("aggressive_flow_score", {
      precision: 8,
      scale: 2,
    }).notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
  },
  (table) => ({
    snapshotLookupIndex: uniqueIndex(
      "market_snapshots_symbol_timeframe_capture_uq",
    ).on(table.symbol, table.timeframe, table.capturedAt),
  }),
);

export const marketDataInputs = pgTable(
  "market_data_inputs",
  {
    id: text("id").primaryKey(),
    symbol: varchar("symbol", { length: 16 }).notNull(),
    timeframe: varchar("timeframe", { length: 8 }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    providerSource: varchar("provider_source", { length: 16 }).notNull(),
    feed: jsonb("feed").$type<Record<string, unknown>>().notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    inputCapturedAtIndex: index("market_data_inputs_captured_at_idx").on(
      table.capturedAt,
    ),
    inputLookupIndex: uniqueIndex(
      "market_data_inputs_symbol_timeframe_capture_uq",
    ).on(table.symbol, table.timeframe, table.capturedAt),
  }),
);

export const tradingSignals = pgTable(
  "trading_signals",
  {
    id: text("id").primaryKey(),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => marketSnapshots.id),
    symbol: varchar("symbol", { length: 16 }).notNull(),
    timeframe: varchar("timeframe", { length: 8 }).notNull(),
    direction: trendDirectionEnum("direction").notNull(),
    action: signalActionEnum("action").notNull(),
    confirmationCount: integer("confirmation_count").notNull(),
    confirmationThreshold: integer("confirmation_threshold").notNull(),
    orderBlockLow: numeric("order_block_low", {
      precision: 18,
      scale: 4,
    }).notNull(),
    orderBlockHigh: numeric("order_block_high", {
      precision: 18,
      scale: 4,
    }).notNull(),
    stopLoss: numeric("stop_loss", { precision: 18, scale: 4 }).notNull(),
    takeProfitOne: numeric("take_profit_one", {
      precision: 18,
      scale: 4,
    }).notNull(),
    takeProfitTwo: numeric("take_profit_two", {
      precision: 18,
      scale: 4,
    }).notNull(),
    checklist: jsonb("checklist")
      .$type<Array<Record<string, unknown>>>()
      .notNull(),
    rationale: text("rationale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    signalCreatedAtIndex: index("trading_signals_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export const executionPlans = pgTable(
  "execution_plans",
  {
    id: text("id").primaryKey(),
    signalId: text("signal_id")
      .notNull()
      .references(() => tradingSignals.id),
    symbol: varchar("symbol", { length: 16 }).notNull(),
    side: orderSideEnum("side").notNull(),
    leverage: integer("leverage").notNull(),
    balanceFractionPct: numeric("balance_fraction_pct", {
      precision: 8,
      scale: 2,
    }).notNull(),
    tranchePlan: jsonb("tranche_plan")
      .$type<Array<Record<string, unknown>>>()
      .notNull(),
    status: executionStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    planSignalIndex: uniqueIndex("execution_plans_signal_id_uq").on(
      table.signalId,
    ),
  }),
);

export const positionEntries = pgTable(
  "position_entries",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => executionPlans.id),
    symbol: varchar("symbol", { length: 16 }).notNull(),
    side: orderSideEnum("side").notNull(),
    stageIndex: integer("stage_index").notNull(),
    entryPrice: numeric("entry_price", { precision: 18, scale: 4 }).notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    notionalUsd: numeric("notional_usd", { precision: 18, scale: 2 }).notNull(),
    realizedPnl: numeric("realized_pnl", { precision: 18, scale: 2 }),
    externalOrderId: text("external_order_id"),
    status: executionStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    planStageIndex: uniqueIndex("position_entries_plan_stage_uq").on(
      table.planId,
      table.stageIndex,
    ),
  }),
);

export const positions = pgTable(
  "positions",
  {
    id: text("id").primaryKey(),
    symbol: varchar("symbol", { length: 16 }).notNull(),
    side: orderSideEnum("side").notNull(),
    sizeUsd: numeric("size_usd", { precision: 18, scale: 2 }).notNull(),
    averageEntryPrice: numeric("average_entry_price", {
      precision: 18,
      scale: 4,
    }).notNull(),
    markPrice: numeric("mark_price", { precision: 18, scale: 4 }).notNull(),
    realizedPnl: numeric("realized_pnl", { precision: 18, scale: 2 }).notNull(),
    unrealizedPnl: numeric("unrealized_pnl", {
      precision: 18,
      scale: 2,
    }).notNull(),
    stopLoss: numeric("stop_loss", { precision: 18, scale: 4 }).notNull(),
    takeProfitOne: numeric("take_profit_one", {
      precision: 18,
      scale: 4,
    }).notNull(),
    takeProfitTwo: numeric("take_profit_two", {
      precision: 18,
      scale: 4,
    }).notNull(),
    status: executionStatusEnum("status").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    symbolStatusIndex: index("positions_symbol_status_idx").on(
      table.symbol,
      table.status,
    ),
  }),
);

export const killSwitchEvents = pgTable(
  "kill_switch_events",
  {
    id: text("id").primaryKey(),
    isEnabled: boolean("is_enabled").notNull(),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventCreatedAtIndex: index("kill_switch_events_created_at_idx").on(
      table.createdAt,
    ),
  }),
);
