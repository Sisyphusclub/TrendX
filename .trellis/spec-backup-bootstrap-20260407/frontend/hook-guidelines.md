# Hook Guidelines

> How shared stateful UI logic should be extracted and reused.

---

## Overview

No hook-based frontend framework is present yet. Use this document when the selected
framework supports hooks or a similar composition primitive.

---

## When To Extract Shared Logic

Create a custom hook or equivalent abstraction when:

- The same stateful logic is needed in multiple components
- A component is becoming hard to read because side effects dominate it
- Data loading, subscriptions, or browser APIs need reusable lifecycle handling

Do not extract a hook just because a block of code is ten lines long.

---

## Scope Rules

- One hook should own one primary concern.
- Separate data-fetching logic from purely visual state when practical.
- Keep framework-independent helpers outside hook files.
- Hooks should expose a stable, intention-revealing API.

Avoid hooks that both fetch remote data and manipulate unrelated UI behavior.

---

## Side Effects

- Effects must have cleanup when they allocate listeners, timers, or subscriptions.
- Browser globals should be accessed deliberately and guarded where needed.
- Avoid hidden network requests or mutations triggered by simple rendering.
- Prefer explicit action functions for writes and mutations.

---

## Data Access

- Centralize caching, retries, and invalidation rules once a data layer exists.
- Keep ad hoc fetching code out of random leaf components.
- When no data library exists yet, start simple and keep fetch behavior explicit.

---

## Naming

- Use the native naming convention of the selected framework.
- If the framework uses hooks, shared hooks should begin with `use`.
- Keep hook names aligned with user intent or domain intent, not implementation details.

Examples of good intent-oriented names:

- `useTrendFeed`
- `useSessionState`
- `useSearchFilters`
