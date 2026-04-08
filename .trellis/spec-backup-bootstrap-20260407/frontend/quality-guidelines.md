# Quality Guidelines

> Quality bar for frontend code added to this repository.

---

## Current State

There is no frontend app or frontend test setup yet. These rules define the minimum
quality bar for bootstrap UI work.

---

## Core Expectations

- Prefer the smallest UI surface needed for the task.
- Keep visual components focused on presentation.
- Keep feature behavior explicit and easy to trace.
- Do not introduce a broad design system, routing layer, and state library in one step
  unless the task is explicitly about app bootstrap.
- Update the relevant spec files when a stack decision becomes real.

---

## UI Behavior Standards

Every meaningful screen or feature should account for:

- Loading state
- Empty state
- Error state
- Responsive behavior
- Keyboard and screen-reader usability when interactive controls are present

Do not ship optimistic "happy path only" UI for real workflows.

---

## Verification Rules

- If a UI test harness exists, add tests for non-trivial behavior changes.
- If no automated checks exist yet, document manual verification clearly.
- Prefer tests around user-observable behavior.
- Run available format, lint, type, and test commands before finishing work.

Do not claim a UI change is verified if the repository has no runnable frontend app yet.

---

## Forbidden Patterns

- Giant page files that own unrelated concerns
- Copy-pasted data fetching across screens
- Shared mutable state without a clear owner
- Hardcoded endpoints or secrets in UI code
- Disabled accessibility checks without explanation
- Bypassing type or validation layers at data boundaries

---

## Bootstrap Completion Rule

Once the real frontend stack exists, replace these defaults with framework-specific
review, testing, and accessibility guidance.
