# Directory Structure

> How frontend code should be organized while the UI stack is still being established.

---

## Overview

There is no frontend source tree yet. Until one exists:

- Keep workflow files out of application directories.
- Choose one explicit frontend root and keep new UI files inside it.
- Prefer feature-first organization over large buckets by file type.

---

## Recommended Initial Layout

If a task introduces the first frontend app, start with one explicit root such as
`frontend/`, `web/`, or `apps/web/`:

```text
<frontend-root>/
├── src/
│   ├── app/ or pages/   # Route or screen entrypoints
│   ├── features/        # Feature-scoped UI, logic, and tests
│   ├── components/      # Shared presentational components
│   ├── hooks/           # Shared stateful logic if the framework uses hooks
│   ├── lib/             # Framework, API, and browser integration code
│   ├── styles/          # Global styles, tokens, theme primitives
│   └── types/           # Shared frontend-only contracts
├── public/              # Static assets
└── tests/               # End-to-end or integration tests
```

If the selected framework uses different routing conventions, adapt this layout but keep
the same separation of concerns.

---

## Organization Rules

- Shared UI belongs in `components/`.
- Feature-specific UI belongs under `features/<feature-name>/`.
- Route or page files should orchestrate data and layout, not hold all business logic.
- Browser or framework integration code belongs in `lib/`.
- Avoid a global `utils/` directory unless ownership and scope are clear.

---

## Naming Conventions

- Frontend roots use lowercase kebab-case.
- Reusable component files use the conventions of the chosen framework, and should be
  consistent within the app.
- Hook-like shared logic should follow the framework's native naming style.
- Feature folders use domain names: `auth`, `dashboard`, `trend-feed`.

Avoid placeholder folder names such as `temp`, `misc`, `common2`, or `new-ui`.

---

## Repository-Specific Notes

Current repository examples of clean separation:

- [AGENTS.md](C:/Users/Administrator/Desktop/TrendX/AGENTS.md) keeps project instructions centralized.
- [.trellis/spec/frontend](C:/Users/Administrator/Desktop/TrendX/.trellis/spec/frontend) groups frontend rules by concern instead of one giant document.

These are infrastructure examples, not UI examples. Replace this section with real
frontend file references once application code exists.
