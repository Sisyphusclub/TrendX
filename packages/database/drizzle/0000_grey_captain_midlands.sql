CREATE TYPE "public"."execution_status" AS ENUM('PENDING', 'ARMED', 'OPEN', 'PROTECTED', 'CLOSED', 'FAILED', 'HALTED');--> statement-breakpoint
CREATE TYPE "public"."order_side" AS ENUM('LONG', 'SHORT', 'FLAT');--> statement-breakpoint
CREATE TYPE "public"."signal_action" AS ENUM('ENTRY', 'EXIT', 'WAIT');--> statement-breakpoint
CREATE TYPE "public"."trend_direction" AS ENUM('BULLISH', 'BEARISH', 'NEUTRAL');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"equity" numeric(18, 2) NOT NULL,
	"used_margin" numeric(18, 2) NOT NULL,
	"available_margin" numeric(18, 2) NOT NULL,
	"exposure_pct" numeric(8, 2) NOT NULL,
	"unrealized_pnl" numeric(18, 2) NOT NULL,
	"realized_pnl" numeric(18, 2) NOT NULL,
	"open_position_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"signal_id" text NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"side" "order_side" NOT NULL,
	"leverage" integer NOT NULL,
	"balance_fraction_pct" numeric(8, 2) NOT NULL,
	"tranche_plan" jsonb NOT NULL,
	"status" "execution_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kill_switch_events" (
	"id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"timeframe" varchar(8) NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"last_price" numeric(18, 4) NOT NULL,
	"open_interest_delta_pct" numeric(8, 2) NOT NULL,
	"cvd_bias_pct" numeric(8, 2) NOT NULL,
	"funding_rate" numeric(8, 4) NOT NULL,
	"large_order_score" numeric(8, 2) NOT NULL,
	"liquidation_sweep_score" numeric(8, 2) NOT NULL,
	"aggressive_flow_score" numeric(8, 2) NOT NULL,
	"raw_payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"side" "order_side" NOT NULL,
	"stage_index" integer NOT NULL,
	"entry_price" numeric(18, 4) NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"notional_usd" numeric(18, 2) NOT NULL,
	"realized_pnl" numeric(18, 2),
	"external_order_id" text,
	"status" "execution_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"side" "order_side" NOT NULL,
	"size_usd" numeric(18, 2) NOT NULL,
	"average_entry_price" numeric(18, 4) NOT NULL,
	"mark_price" numeric(18, 4) NOT NULL,
	"realized_pnl" numeric(18, 2) NOT NULL,
	"unrealized_pnl" numeric(18, 2) NOT NULL,
	"stop_loss" numeric(18, 4) NOT NULL,
	"take_profit_one" numeric(18, 4) NOT NULL,
	"take_profit_two" numeric(18, 4) NOT NULL,
	"status" "execution_status" NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_id" text NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"timeframe" varchar(8) NOT NULL,
	"direction" "trend_direction" NOT NULL,
	"action" "signal_action" NOT NULL,
	"confirmation_count" integer NOT NULL,
	"confirmation_threshold" integer NOT NULL,
	"order_block_low" numeric(18, 4) NOT NULL,
	"order_block_high" numeric(18, 4) NOT NULL,
	"stop_loss" numeric(18, 4) NOT NULL,
	"take_profit_one" numeric(18, 4) NOT NULL,
	"take_profit_two" numeric(18, 4) NOT NULL,
	"checklist" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_signal_id_trading_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."trading_signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_entries" ADD CONSTRAINT "position_entries_plan_id_execution_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."execution_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_signals" ADD CONSTRAINT "trading_signals_snapshot_id_market_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."market_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "account_snapshots_captured_at_idx" ON "account_snapshots" USING btree ("captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "execution_plans_signal_id_uq" ON "execution_plans" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "kill_switch_events_created_at_idx" ON "kill_switch_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "market_snapshots_symbol_timeframe_capture_uq" ON "market_snapshots" USING btree ("symbol","timeframe","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "position_entries_plan_stage_uq" ON "position_entries" USING btree ("plan_id","stage_index");--> statement-breakpoint
CREATE INDEX "positions_symbol_status_idx" ON "positions" USING btree ("symbol","status");--> statement-breakpoint
CREATE INDEX "trading_signals_created_at_idx" ON "trading_signals" USING btree ("created_at");