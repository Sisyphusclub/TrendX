# TrendX

TrendX is a live-trading dashboard and execution system for directional crypto futures.

The repository now boots into a real monorepo scaffold aligned to the selected Trellis
`nextjs-fullstack` template:

- Next.js 15 App Router
- React 19
- oRPC for type-safe APIs
- Drizzle ORM + PostgreSQL
- Turborepo + pnpm workspaces

## MVP Focus

This first scaffold is intentionally limited to PR1 from the project PRD:

- dashboard shell for `BTCUSDT` and `ETHUSDT`
- type-safe oRPC route and frontend client wiring
- database schema skeleton for market snapshots, signals, execution, positions, and risk
- environment contract and monorepo build tooling

Coinank ingestion, Binance execution, and persistent live data will land in later PRs.

## Workspace Layout

```text
.
|-- apps/
|   `-- web/                 # Next.js dashboard app
|-- packages/
|   |-- api/                 # oRPC router and domain modules
|   |-- database/            # Drizzle schema and config
|   `-- logs/                # Structured logger
|-- .trellis/                # Workflow, tasks, specs, journals
|-- .env.example
|-- package.json
|-- pnpm-workspace.yaml
|-- turbo.json
`-- tsconfig.base.json
```

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env` and fill in the real secrets.

3. Start PostgreSQL.

   Option A: Docker

   ```bash
   pnpm db:up
   ```

   Option B: local PostgreSQL service
   Use a local PostgreSQL 16+ instance with:
   - host: `localhost`
   - port: `5432`
   - database: `trendx`
   - username: `postgres`
   - password: `postgres`

4. Run database migrations:

   ```bash
   pnpm db:migrate
   ```

5. Start the dashboard:

   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm db:up
pnpm db:down
pnpm db:logs
pnpm db:migrate
pnpm db:generate
pnpm market-data:compare
pnpm market-data:compare:refresh
pnpm market-data:backfill
```

## Signal Cycle Scheduling

TrendX now exposes an internal signal-cycle endpoint that persists one hourly market
snapshot, one normalized market-input payload, and one signal record per tracked
pair:

- route: `POST /api/internal/signal-cycle`
- auth: `Authorization: Bearer <TRENDX_SIGNAL_CYCLE_SECRET>`
- cadence: run once per signal interval, ideally right after the hourly candle closes

Hosted route example:

```bash
curl -X POST http://127.0.0.1:3000/api/internal/signal-cycle \
  -H "Authorization: Bearer $TRENDX_SIGNAL_CYCLE_SECRET"
```

The endpoint is disabled until `TRENDX_SIGNAL_CYCLE_SECRET` is configured.

For local Windows scheduling:

```powershell
pnpm signal:cycle
pnpm signal:cycle:trigger
pnpm signal:cycle:schedule:windows
```

The registration script creates an hourly Windows scheduled task named
`TrendXSignalCycle` that runs `scripts/run-signal-cycle.ps1`.

- `pnpm signal:cycle`: direct runner, no web server required
- `pnpm signal:cycle:trigger`: hit the internal HTTP route

## Current Data Mode

The dashboard and signal cycle currently support:

- live Coinank market data when the API key is configured
- database-backed local market snapshots when `TRENDX_MARKET_DATA_PROVIDER=local-db`
- seeded fallback data when Coinank is unavailable
- local seeded market news by default (`TRENDX_MARKET_NEWS_PROVIDER=local`)
- refined 15m Coinank price fetch disabled by default (`TRENDX_COINANK_ENABLE_REFINED_PRICE=off`)
- trend-following only
- hourly cadence
- staged entries `30 / 40 / 30`
- 10% balance allocation per entry
- 20x leverage
- global kill-switch visibility
- Binance testnet execution only

When `TRENDX_SIGNAL_CYCLE_MARKET_DATA_PROVIDER=coinank`, the signal-cycle path also
persists the normalized market-input snapshot into both `market_data_inputs` and
`market_snapshots.raw_payload.marketDataSnapshot`. That lets you split ingestion and
read-path providers:

1. keep `TRENDX_SIGNAL_CYCLE_MARKET_DATA_PROVIDER=coinank`
2. persist normalized snapshots to PostgreSQL on every cycle
3. switch `TRENDX_MARKET_DATA_PROVIDER=local-db`
4. read local snapshots without calling Coinank for dashboard signal inputs

This split is important: if both settings are switched to `local-db`, the cycle will only
replay previously persisted snapshots rather than ingesting fresh upstream data.

If you already have legacy `market_snapshots.raw_payload.marketDataSnapshot` rows,
you can backfill the dedicated table with:

```bash
pnpm market-data:backfill
```

To compare current live Coinank output against the local database provider:

```bash
pnpm market-data:compare
```

To refresh the persisted local snapshot first and then compare:

```bash
pnpm market-data:compare:refresh
```

Mainnet execution, automated scheduling infrastructure, and production hardening still
need to be completed before formal launch.
