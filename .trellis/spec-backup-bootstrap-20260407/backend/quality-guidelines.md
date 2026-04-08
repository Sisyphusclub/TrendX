# Quality Guidelines

> Quality bar for backend code added to this repository.

---

## Current State

There is no backend code or backend test harness yet. These rules define the quality
bar for the first backend changes.

---

## Core Expectations

- Prefer the smallest change that solves the task.
- Keep transport code thin and domain logic explicit.
- Add new dependencies only when the task justifies them.
- Leave clear run instructions whenever a new backend process is introduced.
- Update Trellis specs when an architectural decision becomes real.

---

## Testing Rules

- If a backend test harness exists, new behavior-changing logic should ship with tests.
- If no test harness exists yet, document the verification method in the task notes or PR.
- Prefer tests around observable behavior, not private implementation details.
- When adding the first backend service, also add the minimum viable check command if practical.

Do not claim code is fully verified when no automated checks exist.

---

## Code Review Rules

- Keep modules cohesive and named by domain or responsibility.
- Make side effects explicit.
- Prefer clear data flow over clever abstractions.
- Keep configuration and environment assumptions obvious.
- Remove dead scaffolding that is introduced and then abandoned in the same change.

---

## Forbidden Patterns

- Business logic inside controllers, handlers, or route definitions
- Hidden global mutable state
- Catch-all exception blocks that ignore failures
- Silent fallback behavior for critical operations
- Circular dependencies between modules
- Utility modules that perform hidden I/O
- New framework layers added without a real need

---

## Bootstrap Completion Rule

When the repository gains a real backend stack, revisit this file and replace the
bootstrap defaults with stack-specific testing, review, and CI requirements.
