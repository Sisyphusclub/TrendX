# Database Guidelines

> Rules for introducing and evolving persistence in this repository.

---

## Current State

No database engine, ORM, migration tool, or schema directory exists in the repository
yet.

That means:

- There is no approved default database.
- There is no approved default ORM.
- Persistence choices must be made explicitly in the task that introduces them.

---

## Selection Rules

Before adding a database layer:

1. State why persistence is needed.
2. Record the selected engine and access strategy in the task PRD or notes.
3. Prefer the smallest viable persistence layer for the task.
4. Avoid adding both an ORM and handwritten query layer unless there is a concrete need.

Do not introduce a database just to cache temporary state or avoid passing data through
existing layers.

---

## Access Patterns

Once persistence exists, follow these defaults:

- Keep database access out of transport and UI boundary code.
- Put queries behind a repository, data-access, or module-level persistence boundary.
- Use parameterized queries only.
- Make transactions explicit around multi-step writes.
- Keep read models and write models simple until there is a real scaling need.

Avoid:

- Inline SQL or ORM calls inside request handlers
- Hidden transactions
- Cross-module table access without a clear owning module
- Silent schema drift without migrations

---

## Migration Rules

When the first migration system is introduced:

- Every schema change must ship with a migration.
- Document backward-compatibility assumptions for destructive changes.
- Separate schema migration from data backfill logic when possible.
- Prefer additive changes first, then cleanup in a later task if the rollout is risky.

---

## Naming Defaults

Until the actual database tooling is chosen:

- Prefer snake_case for database identifiers.
- Use stable primary keys.
- Include `created_at` and `updated_at` when records are mutable.
- Keep naming aligned between schema, domain terms, and API contracts.

If the chosen database or ORM imposes a different convention, update this document to
match reality.

---

## Examples

There are no database examples in this repository yet. The first task that adds
persistence should update this file with real file paths.
