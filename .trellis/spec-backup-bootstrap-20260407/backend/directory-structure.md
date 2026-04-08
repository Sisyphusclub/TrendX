# Directory Structure

> How backend code should be organized while this repository is still in bootstrap mode.

---

## Overview

There is no backend source tree in the repository yet. Until one exists, follow these
rules:

- Keep workflow infrastructure under `.trellis/`, `.agents/`, and `.codex/` untouched.
- Do not mix runtime backend code into those workflow directories.
- Choose one explicit backend root and keep all new backend files inside it.

---

## Recommended Initial Layout

If a task introduces the first backend service, start with one explicit root such as
`backend/` or `apps/api/` and keep the structure shallow:

```text
<backend-root>/
├── src/
│   ├── app/          # Process bootstrap, server wiring, startup config
│   ├── modules/      # Feature or domain modules
│   ├── lib/          # External integrations and infrastructure adapters
│   ├── shared/       # Cross-cutting helpers with clear ownership
│   └── types/        # Shared backend-only contracts if needed
├── tests/            # Integration and unit tests
└── README.md         # Run, env, and ownership notes
```

If the project later becomes a monorepo, update this doc and move to a package-based
layout deliberately rather than gradually scattering files.

---

## Module Organization

Default to feature-first organization:

- Request entrypoints belong near the feature they serve, or in a thin transport layer.
- Business rules belong in `modules/`, not in route or controller files.
- External service wrappers belong in `lib/`.
- Shared utilities should be rare and narrow. If a helper is only used by one module,
  keep it inside that module.

Do not create generic dumping grounds like `utils/`, `helpers/`, or `common/` unless
the contents have a clear and reviewed scope.

---

## Naming Conventions

- Top-level backend roots use lowercase kebab-case: `backend/`, `apps/api/`.
- Feature folders use domain names, not implementation details: `billing/`, `auth/`,
  `trend-ingestion/`.
- Files should follow the conventions of the chosen language, but stay consistent within
  a module.
- Entry files should be obvious from the name: `server`, `app`, `main`, `routes`,
  `handlers`, `service`, `repository`.

Avoid names like `misc`, `temp`, `new`, `test2`, or `final`.

---

## Repository-Specific Notes

Current repository examples of disciplined separation:

- [AGENTS.md](C:/Users/Administrator/Desktop/TrendX/AGENTS.md) keeps project instructions at the root.
- [session-start.py](C:/Users/Administrator/Desktop/TrendX/.codex/hooks/session-start.py) isolates one hook entrypoint.
- [.trellis/scripts/common](C:/Users/Administrator/Desktop/TrendX/.trellis/scripts/common) groups infrastructure helpers by responsibility.

These are not backend runtime files, but they show the organizational standard to
follow: clear ownership, narrow responsibility, and no ambiguous dumping areas.
