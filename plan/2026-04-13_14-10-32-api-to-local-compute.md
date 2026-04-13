---
mode: plan
cwd: C:\Users\Administrator\Desktop\TrendX
task: Replace API-backed market data with local compute while preserving real exchange execution
complexity: complex
planning_method: builtin
created_at: 2026-04-13T14:10:32.7239071+08:00
---

# Plan: Replace API Market Data With Local Compute

## Task Overview

TrendX currently mixes three concerns in the same path: external market-data fetching, local signal computation, and exchange/account state assembly. The goal of this plan is to replace API-backed market-data inputs with locally computed or locally persisted inputs, without accidentally breaking the dashboard, signal-cycle persistence, or Binance execution semantics.

This plan treats **Coinank market/news data** and **Binance execution/account state** separately. Coinank-backed signal inputs are candidates for replacement. Binance account sync and order placement are not local-compute concerns and should remain live exchange integrations unless the product scope changes.

## Investigation Summary

### What is already local

The signal engine already contains substantial local computation in [`packages/api/src/modules/dashboard/lib/build-overview.ts:94`](packages/api/src/modules/dashboard/lib/build-overview.ts:94) through [`packages/api/src/modules/dashboard/lib/build-overview.ts:1655`](packages/api/src/modules/dashboard/lib/build-overview.ts:1655):

- trend direction is derived locally from price/OI delta
- order block detection is computed locally from candle arrays
- refinement, structure break, displacement, stage planning, stop-loss, and targets are computed locally
- entry gating and rationale generation are local

In practice, TrendX already has a local signal engine. The missing piece is a stable local source for the input snapshot consumed by that engine.

### What is still API-backed

Coinank currently provides the raw inputs used by the local engine in [`packages/api/src/modules/dashboard/lib/coinank-client.ts:342`](packages/api/src/modules/dashboard/lib/coinank-client.ts:342), [`packages/api/src/modules/dashboard/lib/coinank-client.ts:367`](packages/api/src/modules/dashboard/lib/coinank-client.ts:367), [`packages/api/src/modules/dashboard/lib/coinank-client.ts:387`](packages/api/src/modules/dashboard/lib/coinank-client.ts:387), [`packages/api/src/modules/dashboard/lib/coinank-client.ts:407`](packages/api/src/modules/dashboard/lib/coinank-client.ts:407), [`packages/api/src/modules/dashboard/lib/coinank-client.ts:431`](packages/api/src/modules/dashboard/lib/coinank-client.ts:431), [`packages/api/src/modules/dashboard/lib/coinank-client.ts:462`](packages/api/src/modules/dashboard/lib/coinank-client.ts:462), [`packages/api/src/modules/dashboard/lib/coinank-client.ts:523`](packages/api/src/modules/dashboard/lib/coinank-client.ts:523), and [`packages/api/src/modules/dashboard/lib/coinank-client.ts:569`](packages/api/src/modules/dashboard/lib/coinank-client.ts:569):

- price candles
- refined lower-timeframe price candles
- open-interest candles
- funding-rate candles
- liquidation history
- long/short realtime taker-flow data
- CVD bias
- market news

### Architectural choke point

[`packages/api/src/modules/dashboard/lib/build-overview.ts:1703`](packages/api/src/modules/dashboard/lib/build-overview.ts:1703) is the shared choke point:

- dashboard API calls it via [`packages/api/src/modules/dashboard/procedures/get-overview.ts:10`](packages/api/src/modules/dashboard/procedures/get-overview.ts:10)
- signal-cycle persistence calls it via [`packages/api/src/modules/dashboard/lib/run-signal-cycle.ts:259`](packages/api/src/modules/dashboard/lib/run-signal-cycle.ts:259)
- execution logic calls it via [`packages/api/src/modules/execution/lib/execute-testnet-order.ts:439`](packages/api/src/modules/execution/lib/execute-testnet-order.ts:439)

This means any data-source change will affect UI, persistence, and execution together unless the orchestration is decoupled first.

### Missing foundation

There is no visible local raw-market-data store yet. The current database snapshot tables in [`packages/database/src/drizzle/schema/trading.ts:65`](packages/database/src/drizzle/schema/trading.ts:65) and [`packages/database/src/drizzle/schema/trading.ts:100`](packages/database/src/drizzle/schema/trading.ts:100) persist **derived outputs**, not replayable source inputs.

That is the critical blocker to “replace API data with local compute” as a direct change. The repository currently lacks:

- canonical local candle storage
- canonical local OI/funding/liquidation/aggressive-flow storage
- a provider abstraction separating raw input acquisition from signal calculation

### Hidden coupling to remove

Feed-mode and execution guards currently infer system state from human-readable reason strings:

- frontend feed-state parser: [`apps/web/modules/dashboard/lib/feed-state.ts:5`](apps/web/modules/dashboard/lib/feed-state.ts:5)
- execution fallback blocking: [`packages/api/src/modules/execution/lib/execute-testnet-order.ts:34`](packages/api/src/modules/execution/lib/execute-testnet-order.ts:34)

This coupling should be replaced by structured fields before or during migration.

## Scope Boundary

### In scope

- replace Coinank-backed market snapshot inputs with a local provider
- keep the existing signal engine logic, but extract it behind clearer boundaries
- support dashboard overview, signal-cycle persistence, and execution prechecks from the same locally sourced snapshot
- decide a replacement strategy for market news

### Out of scope for this migration

- replacing Binance account state with local computation
- replacing Binance order placement with local computation
- changing the trading strategy itself beyond what is required for metric parity

## Recommended Architecture

### Target layering

1. `MarketDataProvider`
   - returns a canonical raw or normalized market snapshot for one symbol and timeframe
   - implementations: `coinank-provider` and `local-compute-provider`

2. `SignalEngine`
   - pure local computation over normalized inputs
   - owns trend direction, order block logic, entry stages, protection levels, checklist, rationale

3. `OverviewAssembler`
   - combines `SignalEngine` output with account/execution state
   - produces the API output contract for dashboard/execution/signal-cycle

4. `FeedStatus`
   - structured status object instead of reason-string parsing

### Canonical normalized input

Create one internal snapshot shape that becomes the contract between providers and the signal engine. It should cover:

- symbol
- timeframe
- primary price candles
- refined lower-timeframe price candles
- funding candles or funding metric
- open-interest candles or OI delta series
- liquidation sweep inputs
- aggressive-flow inputs
- optional cvd metric
- provider metadata: source, generatedAt, freshness, completeness

Once this exists, the engine no longer needs to know whether the source was Coinank or local compute.

## Execution Plan

1. Clarify migration scope and success criteria.
   - Freeze the meaning of “replace API data source” as “replace Coinank-backed market/news inputs”.
   - Explicitly preserve Binance live account sync and order placement.
   - Decide whether market news becomes local-generated, static fallback-only, or removed from the MVP.

2. Extract a normalized provider contract.
   - Introduce internal types for canonical market inputs and provider metadata.
   - Move Coinank-specific transport/data-shape code behind a provider interface.
   - Keep public API response schemas unchanged during this phase.

3. Extract the pure signal engine from `build-overview.ts`.
   - Move trend, order-block, checklist, entry-stage, and protection-target logic into a standalone engine module.
   - Ensure the engine accepts normalized inputs and produces deterministic outputs.
   - Add fixture-based tests so engine outputs remain stable before changing providers.

4. Design and add local raw-market-data storage.
   - Add tables for replayable inputs instead of only derived `market_snapshots`.
   - At minimum, store the source series needed by the current engine: price candles, refined candles, OI, funding, liquidation, aggressive flow, and metadata.
   - Version the storage schema so later metric definition changes are auditable.

5. Implement the local-compute provider.
   - Read from local persisted series and compute the normalized input snapshot.
   - Recompute metrics currently sourced from Coinank endpoints, or redefine them with explicit formulas when parity is impossible.
   - Mark completeness/fallback state explicitly in structured metadata.

6. Refactor `buildDashboardOverview()` into orchestration only.
   - Select provider based on config.
   - Run `SignalEngine` on normalized input.
   - Merge Binance account state after signal generation.
   - Return structured feed metadata in addition to or instead of free-form reason strings.

7. Update signal-cycle persistence and execution dependencies.
   - Persist provider/source metadata together with each snapshot.
   - Make execution guards consume structured feed/source status rather than parsing prose.
   - Ensure `getHardRiskBlockReason()` still works when signals are locally sourced.

8. Migrate frontend feed-state handling.
   - Replace string parsing in `feed-state.ts` with explicit fields from the API output.
   - Keep the UX labels compatible with existing dashboard states.
   - Verify risk and fallback banners still behave correctly.

9. Run a shadow-mode rollout before removing Coinank.
   - Run Coinank provider and local provider in parallel for the same symbols/timeframes.
   - Compare trend direction, entry action, order block range, stop-loss, take-profit, and checklist outputs.
   - Only switch the default provider after parity thresholds are met and logged.

10. Remove or quarantine Coinank-specific paths.
   - Delete or isolate Coinank transport code only after shadow validation succeeds.
   - Remove unused environment variables and reason strings.
   - Update README and ops docs to reflect the new source of truth.

## Key Decisions Required

### Decision 1: What does “local compute” use as raw input?

One of these must become the real source of truth:

- locally persisted exchange market series
- internally computed aggregates from an ingestion job
- existing stored snapshots extended into replayable source data

Without this decision, “replace API data source” is underspecified.

### Decision 2: Which Coinank metrics need strict parity?

The hardest fields to replace exactly are:

- liquidation history
- aggressive-flow / long-short realtime
- CVD bias
- market news

For each one, choose either:

- strict parity
- approximate equivalent with new formula
- remove from checklist/UI

### Decision 3: Should market news stay in the product?

Market news is not a “local compute” problem in the same sense as signals. Pick one path:

- keep as static fallback content only
- generate summaries from internal stored content
- remove the live-news module from the MVP

## Risks And Tradeoffs

- The current codebase has no obvious local raw-input store, so this is not a provider swap; it is a data-foundation project.
- Existing `marketSnapshots` rows cannot reconstruct the full signal input state, so they are not enough for deterministic backfill.
- If metric definitions change during migration, old and new signals may become incomparable unless provider/version metadata is stored.
- Frontend and execution behavior will drift if reason-string coupling is not removed early.
- Replacing Binance account sync with local data would be a product change, not a refactor.

## Validation Plan

1. Unit test the extracted signal engine with fixed snapshots.
2. Add provider-contract tests to ensure Coinank and local providers both produce valid normalized snapshots.
3. Add parity tests comparing Coinank-vs-local outputs on the same recorded series.
4. Add API tests for `getOverview` and signal-cycle persistence under live, mixed, and fallback states.
5. Add execution regression tests covering fallback blocking, current-signal-cycle checks, and structured feed-state handling.

## Suggested First Implementation Slice

If this migration starts now, the lowest-risk first slice is:

1. introduce `MarketDataProvider` + normalized snapshot type
2. extract pure `SignalEngine` from `build-overview.ts`
3. return structured feed metadata alongside the current `reason`
4. keep Coinank as the first provider while tests lock behavior

That creates a safe seam for the later local-data replacement without breaking dashboard or execution flows immediately.

## References

- `packages/api/src/modules/dashboard/lib/build-overview.ts:1471`
- `packages/api/src/modules/dashboard/lib/build-overview.ts:1703`
- `packages/api/src/modules/dashboard/lib/coinank-client.ts:342`
- `packages/api/src/modules/dashboard/lib/coinank-client.ts:523`
- `packages/api/src/modules/dashboard/lib/coinank-client.ts:569`
- `packages/api/src/modules/dashboard/lib/run-signal-cycle.ts:259`
- `packages/api/src/modules/dashboard/procedures/get-overview.ts:10`
- `packages/api/src/modules/execution/lib/execute-testnet-order.ts:34`
- `packages/api/src/modules/execution/lib/execute-testnet-order.ts:439`
- `packages/database/src/drizzle/schema/trading.ts:65`
- `apps/web/modules/dashboard/lib/feed-state.ts:5`
- `README.md:23`
