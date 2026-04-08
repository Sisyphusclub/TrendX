# Brainstorm: Bootstrap TrendX Project Foundation

## Goal

Define the first real product slice for `TrendX` so this repository can move from
workflow-only infrastructure into an implementation-ready Next.js + oRPC + PostgreSQL
project.

## What I Already Know

- The repository has Trellis and Codex integration installed.
- The project name is `TrendX`.
- The official Trellis `nextjs-fullstack` spec template is selected.
- The intended stack is Next.js 15 + React 19 + oRPC + Drizzle ORM + PostgreSQL.
- There is no runtime scaffold or application code yet.
- The current task is the active kickoff task for turning this repo into a real product.
- TrendX v1 needs a dashboard.
- The dashboard should use metrics from the Coinank API to judge the current trend of a
  specified trading pair.
- The system should generate three decision states: entry, exit, and wait.
- After a signal is generated, the system needs to connect to an exchange to place
  orders, close positions, set take-profit, set stop-loss, and display PnL.
- The user has now defined a concrete trading workflow based on direction detection,
  order-block entries, multi-signal confirmation, and staged execution.

## Assumptions (Temporary)

- `TrendX` is a trading decision and execution product, not a generic trend content app.
- The first version should be a thin but runnable full-stack slice, not a large platform.
- The initial architecture should stay close to the Trellis template instead of inventing
  a custom structure immediately.
- Signal generation likely needs a persistent strategy/config model and execution history.
- Trend determination and entry confirmation are deterministic rule-engine steps, not
  discretionary operator actions in MVP.

## Open Questions

- None currently. Ready for final confirmation.

## Requirements (Evolving)

- Preserve the selected Trellis stack direction.
- Keep project documentation aligned with real repository state.
- Build a dashboard around specified trading pairs.
- Ingest Coinank metrics relevant to trend judgment.
- Generate entry / exit / wait signals for a pair.
- Integrate with an exchange for trading actions after a signal is produced.
- Binance is the first and only exchange target in MVP.
- MVP prioritizes real-money Binance execution instead of testnet-first rollout.
- MVP monitors and auto-trades exactly two configured trading pairs: `BTCUSDT` and
  `ETHUSDT`.
- Coinank indicators are converted into signals through a fixed rule engine in MVP.
- Position sizing uses 5% of account balance per entry.
- Execution uses 20x leverage and full-position mode on Binance.
- The same rule engine that generates signals also computes take-profit and stop-loss
  levels.
- MVP allows repeated entries and position add-ons for a pair that already has an open
  position.
- Signal evaluation and automatic execution run on a 1-hour cadence.
- MVP only executes trend-following trades.
- In an uptrend, the system only opens/adds long positions.
- In a downtrend, the system only opens/adds short positions.
- The system does not open counter-trend trades.
- MVP includes a manual global kill switch that immediately stops new automatic
  executions.
- Support order placement, position close, take-profit, stop-loss, and PnL display.
- The MVP dashboard must show account risk information in addition to signal, PnL, and
  execution state.
- MVP execution mode is full automatic execution after signal generation.
- The rule engine first determines market direction before evaluating entry candles.
- Direction detection must consider:
  - OI trend together with price direction
  - CVD direction
  - Whether funding rate is extreme
- Direction bias rules:
  - OI up + price up => real bullish trend bias
  - OI up + price down => real bearish trend bias
- The system then switches to the 1-hour chart and identifies the nearest order block
  aligned with the chosen direction.
- The system must not chase price away from the order block; it waits for price to return
  to the order-block region.
- When price reaches the order block, the system performs a pre-entry confirmation
  checklist using Coinank and order-flow signals.
- The pre-entry confirmation checklist includes:
  - OI still increasing
  - CVD supporting the trade direction
  - Funding rate remains reasonable
  - Large orders appear
  - Liquidation heatmap shows a nearby sweep has just occurred
  - Order flow shows aggressive trades in the intended direction
- If 3 or more confirmation items match, the system enters.
- If only 1-2 confirmation items match, the system continues waiting and does not enter.
- If 0 confirmation items match, the system waits for the next opportunity.
- Entry execution is staged into three tranches inside the order block:
  - upper edge 30%
  - middle 40%
  - lower edge 30%
- Stop-loss is placed slightly outside the order-block boundary.
- If the order block is invalidated or broken, the position must be closed
  unconditionally.
- First take-profit target is the previous major swing high or low.
- Second take-profit target is the next order block or FVG region.
- Choose a first product slice that can be implemented as a small but real full-stack MVP.

## Acceptance Criteria (Evolving)

- [x] The repository documents the selected stack honestly.
- [x] The kickoff task is active in Trellis.
- [x] The core user outcome for `TrendX` v1 is defined.
- [x] The execution mode boundary for MVP is defined.
- [x] The first exchange target for MVP is defined.
- [x] The trading environment boundary for MVP is defined.
- [x] The trading pair scope for MVP is defined.
- [x] The signal-generation approach for MVP is defined.
- [x] The position-sizing rule for MVP is defined.
- [x] The TP/SL rule for MVP is defined.
- [x] The per-pair position concurrency rule for MVP is defined.
- [x] The signal evaluation cadence for MVP is defined.
- [x] The directional trading scope for MVP is defined.
- [x] The operator kill-switch / pause-control requirement is defined.
- [x] The MVP dashboard information set is defined.
- [x] The rule-engine indicator set is defined.
- [x] The low-confidence entry behavior is defined.
- [x] The first runnable MVP scope is explicit.
- [x] The implementation scaffold can be generated without guessing product intent.

## Definition of Done (Team Quality Bar)

- Requirements are specific enough to scaffold the project confidently.
- MVP scope and out-of-scope are explicit.
- Stack and architecture assumptions are documented.
- Task PRD reflects the agreed direction.

## Out of Scope (Explicit)

- Replacing the selected stack template
- Building large multi-role platform features before MVP scope is clear
- Designing production deployment, scaling, or billing flows now
- Writing placeholder product code detached from a real user need
- Multi-strategy portfolio management unless MVP explicitly includes it
- Advanced quant backtesting unless MVP explicitly includes it

## Technical Notes

- Root project doc: `README.md`
- Selected specs: `.trellis/spec/backend/`, `.trellis/spec/frontend/`, `.trellis/spec/shared/`
- Official template assumes package paths such as `packages/*` and aliases such as
  `@your-app/*`; those are still target architecture references until scaffolded
- Current MVP pair scope: `BTCUSDT`, `ETHUSDT`
- Current signal approach: fixed rule engine over Coinank metrics
- Current execution sizing: 5% of account balance, 20x leverage, full-position mode
- Current TP/SL approach: derived by the rule engine together with the signal
- Current position behavior: repeated entries / add-on entries are allowed
- Current execution cadence: 1 hour
- Current directional scope: trend-following only, no counter-trend entries
- Current operator control: manual global kill switch required
- Current dashboard scope includes account risk information
- Current rule inputs include OI, price direction, CVD, funding rate, large-order
  activity, liquidation sweeps, and directional order-flow confirmation
- Current entry geometry is order-block based with 30/40/30 staged execution

## Research Notes

### Constraints from our project

- We already selected a production-oriented full-stack TypeScript template.
- The first slice should benefit from typed frontend-backend contracts.
- PostgreSQL implies there should be real domain data, not a purely static landing page.
- Exchange execution introduces higher risk than a signal-only dashboard, so the MVP
  execution boundary matters early.
- Supporting only `BTCUSDT` and `ETHUSDT` keeps scheduling, state tracking, and operator
  visibility manageable in v1.
- Real-money auto execution favors deterministic and auditable signal logic over
  AI-assisted or highly dynamic signal generation.
- 20x leveraged live execution makes TP/SL and kill-switch behavior MVP-critical.
- Deriving TP/SL from the same rules as the entry/exit signal keeps execution logic
  internally consistent, but increases the need for traceability of rule outputs.
- Allowing repeated entries increases the need for clear add-on rules, position average
  price tracking, and execution history per pair.
- A 1-hour cadence reduces noise and operational churn, but requires clear definition of
  what hourly snapshot or candle boundary the rule engine uses.
- Trend-following only is simpler than fully symmetric long/short logic, but the rule
  engine still needs an explicit definition of what counts as uptrend vs downtrend.
- Live automated execution requires an operator-visible emergency stop even if pair-level
  controls are deferred.
- Since execution is real-money and leveraged, operator visibility must include account
  balance and risk state rather than just trade outcomes.

### Coinank indicator families observed

- Funding rate
- Long/short ratio
- Open interest
- Order-book depth difference
- Liquidation heatmap / liquidation map
- The open API entry page also exposes hourly granularity, which matches the chosen `1h`
  execution cadence
- CVD
- Large-order activity
- Directional order-flow / active trade pressure

### Selected fixed-rule engine structure for TrendX

**Stage 1: Determine directional bias**

- Use OI trend together with price direction as the primary trend classifier
- Cross-check with CVD direction
- Reject or weaken direction when funding is extreme

**Stage 2: Wait for structural location**

- On the 1-hour chart, identify the nearest directional order block
- Wait for price to revisit the order-block region instead of chasing

**Stage 3: Confirm the entry**

- Evaluate six confirmation checks:
  - OI increase
  - CVD support
  - Reasonable funding
  - Large-order appearance
  - Nearby liquidation sweep
  - Directional aggressive order flow
- 3 or more confirmations => enter
- 1-2 confirmations => wait
- 0 confirmations => wait

**Stage 4: Execute and manage**

- Stage entries 30 / 40 / 30 across the order block
- Put stop-loss outside the order-block boundary
- Exit immediately if the order block fails
- Take profit first at prior swing high/low, then at next OB or FVG

### Feasible product directions here

**Approach A: Signal dashboard with manual execution**

- How it works: system generates signals, user reviews them, then confirms execution.
- Pros: lower operational risk, simpler auditability, faster MVP.
- Cons: less automation value.

**Approach B: Signal dashboard with semi-automatic execution** (Recommended)

- How it works: system creates executable trade plans from signals, and the user enables
  execution per pair or per strategy.
- Pros: balances product value and control, good step toward full automation.
- Cons: more execution-state complexity than purely manual flows.

**Approach C: Fully automatic signal-to-execution bot**

- How it works: approved strategy rules directly trigger exchange execution and position
  management.
- Pros: strongest automation story.
- Cons: highest risk, highest monitoring burden, and largest MVP scope.

## Decision (ADR-lite)

**Context**: TrendX needs to turn trend signals into real exchange actions.

**Decision**: MVP will use full automatic execution instead of advisory-only or
manual-confirm flows, Binance will be the first execution target, and the MVP will
prioritize real-money execution instead of testnet-first rollout.

**Consequences**:

- Exchange integration is a first-class core requirement, not a later add-on.
- Order lifecycle state, failure handling, and auditability become MVP concerns.
- Binance account integration, symbol mapping, and order lifecycle handling become
  immediate product and architecture concerns.
- Risk controls, kill switches, and operator-visible execution state are now MVP-grade
  requirements rather than future enhancements.
- Pair management stays intentionally narrow in MVP: `BTCUSDT` and `ETHUSDT` only.
- Signal generation must remain deterministic, explainable, and easy to inspect because
  it directly drives live execution.
- Position sizing must be explicit and persisted because live leverage settings directly
  affect liquidation risk and execution outcomes.
- Every generated signal should persist its computed TP/SL values so operator review and
  execution audits can reconstruct why a trade was opened and how exits were set.
- The system must persist every add-on execution so PnL and risk exposure can be
  reconstructed across multiple entries on the same pair.
- Scheduler runs and rule-engine evaluations must be timestamped against hourly cycles so
  signal history and execution decisions can be audited accurately.
- Each signal record should persist the detected trend direction so the system can prove
  why a long or short entry was considered valid.
- Kill-switch activations should be persisted with timestamp and operator intent so
  execution stoppages are auditable.
- Dashboard views should persist and expose enough account-risk data to explain whether
  the system was in a safe state when it decided to execute.
- The rule engine now has a clear four-stage shape: direction, location, confirmation,
  execution.
- Low-confidence scenarios are intentionally conservative: 1-2 confirmations do not
  trigger reduced-size probing trades in MVP.

## Technical Approach

TrendX MVP is a live-execution trading dashboard and hourly automation service for
`BTCUSDT` and `ETHUSDT` on Binance.

Core subsystems:

- **Coinank ingestion layer**
  - Pull hourly metrics and supporting market context
  - Persist snapshots used by the rule engine
- **Rule engine**
  - Stage 1: determine directional bias
  - Stage 2: detect relevant order block on the 1-hour chart
  - Stage 3: run confirmation checklist
  - Stage 4: compute staged execution plan, stop-loss, and targets
- **Execution engine**
  - Connect to Binance live account
  - Open/add positions with 5% balance sizing, 20x leverage, full-position mode
  - Place stop-loss and take-profit orders
  - Exit immediately if the order block is invalidated
- **State and audit layer**
  - Persist signal snapshots, rule outputs, execution attempts, fills, position changes,
    PnL, and kill-switch events
- **Dashboard**
  - Show per-pair trend direction, signal state, confirmation results, open position,
    staged entries, TP/SL, execution state, realized/unrealized PnL
  - Show account balance, used margin, available margin, and overall risk exposure
  - Provide a manual global kill switch

## Final MVP Scope

- Single operator dashboard for `BTCUSDT` and `ETHUSDT`
- Hourly rule evaluation only
- Trend-following only
- Binance live execution only
- Repeated add-on entries allowed
- Global kill switch required
- No counter-trend trades
- No watchlist management beyond the two configured pairs
- No backtesting engine
- No multi-user collaboration
- No pair-level pause controls in MVP

## Implementation Plan (Small PRs)

- **PR1: Project scaffold**
  - Generate the Next.js + oRPC + PostgreSQL app structure
  - Set up shared types, env handling, database schema skeleton, and dashboard shell
- **PR2: Market data + rule engine**
  - Integrate Coinank data ingestion
  - Persist hourly snapshots
  - Implement the four-stage deterministic strategy engine
- **PR3: Binance execution**
  - Add live exchange integration
  - Implement staged entries, TP/SL placement, exits, and kill switch enforcement
- **PR4: Dashboard + auditability**
  - Expose signal history, execution logs, PnL, and risk panels
  - Finalize operator controls and verification flow
