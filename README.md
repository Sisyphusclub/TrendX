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

3. Start the dashboard:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm db:generate
```

## Current Data Mode

The dashboard currently renders seeded strategy data that mirrors the approved MVP rule
shape:

- trend-following only
- hourly cadence
- staged entries `30 / 40 / 30`
- 10% balance allocation per entry
- 20x leverage
- global kill-switch visibility

The goal of this scaffold is to make the future Coinank and Binance integrations plug
into stable contracts instead of being invented ad hoc.
