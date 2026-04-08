# Type Safety

> How data contracts should be kept safe in frontend code.

---

## Current State

No frontend language or runtime has been selected yet, so this document defines
stack-agnostic safety rules first.

---

## Boundary Rules

- Treat network responses, local storage, query strings, and environment data as untrusted input.
- Validate or narrow boundary data before it spreads through the UI.
- Keep contract definitions close to the feature or API client that owns them.
- Prefer one authoritative type or schema per payload shape.

---

## Typed Stacks

If the selected frontend stack is typed:

- Enable strict settings as early as practical.
- Avoid `any`-style escape hatches in shared code.
- Use narrow types at boundaries and richer types after validation.
- Keep generated or shared API contracts in a stable location.

---

## Untyped Stacks

If the selected frontend stack is untyped:

- Validate important inputs explicitly.
- Centralize runtime schema checks for API payloads and persisted data.
- Avoid passing loosely shaped objects through many layers unchanged.

---

## Shared Contract Rules

- UI code should not depend on undocumented response shapes.
- Parse remote data once, then use the validated shape internally.
- Keep conversion between API models and view models explicit.
- Update this document once a concrete language and validation approach are chosen.

---

## Examples

There are no frontend code examples in this repository yet. Add concrete file references
once the first UI module is committed.
