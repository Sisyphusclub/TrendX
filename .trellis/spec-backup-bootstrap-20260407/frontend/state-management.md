# State Management

> How frontend state should be introduced and owned.

---

## Current State

No frontend state library or application state model exists yet.

This means the first UI task should choose state boundaries carefully instead of adopting
a large global store by default.

---

## Decision Order

Prefer this order when introducing state:

1. Local component state
2. Feature-level shared state
3. Route-level or app-level shared state
4. Global state library only when the first three are clearly insufficient

Server data is not automatically the same thing as client state. Keep those concerns
separate.

---

## Ownership Rules

- Each state domain should have one obvious owner.
- Shared state should live close to the feature that needs it.
- Persisted state needs explicit reset and migration behavior.
- Derived state should be derived, not duplicated.

Avoid copying the same data into multiple stores without a synchronization strategy.

---

## Server Data

- Prefer a dedicated data-fetching pattern over ad hoc duplication in local state.
- Cache remote data intentionally.
- Keep optimistic updates narrow and reversible.
- Do not treat every API response as permanent global state.

---

## Bootstrap Rule

The first task that introduces a frontend state library must also document:

- Why local state was not enough
- Which state belongs in the library
- How async server data is handled
- Where the store or provider lives

Update this document with the actual stack once that happens.
