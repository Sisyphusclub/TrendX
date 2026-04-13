CREATE TABLE "market_data_inputs" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"timeframe" varchar(8) NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"provider_source" varchar(16) NOT NULL,
	"feed" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "market_data_inputs_captured_at_idx" ON "market_data_inputs" USING btree ("captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "market_data_inputs_symbol_timeframe_capture_uq" ON "market_data_inputs" USING btree ("symbol","timeframe","captured_at");