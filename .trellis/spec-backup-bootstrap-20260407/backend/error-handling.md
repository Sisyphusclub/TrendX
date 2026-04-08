# Error Handling

> How backend errors should be represented, logged, and exposed.

---

## Overview

No backend transport layer exists yet, so this document defines the default behavior
for the first backend implementation.

The main rule is simple: errors should be explicit at the boundary and precise inside
the system.

---

## Error Categories

Use explicit categories instead of raw strings or anonymous exceptions:

- Validation error
- Authentication or authorization error
- Not found error
- Conflict error
- Upstream dependency error
- Rate limit or capacity error
- Internal error
- Misconfiguration error

If the chosen language supports typed errors, use them. If not, use a consistent error
shape and a shared translation layer.

---

## Boundary Rules

- Convert internal errors to stable API or process-level outcomes at the boundary.
- Do not leak stack traces, SQL errors, or secret-bearing messages to callers.
- Log enough context to debug the issue without logging secrets.
- Fail fast on invalid configuration during startup.
- Return deterministic error codes or messages for expected user errors.

Avoid swallowing exceptions and returning success-like responses after partial failure.

---

## Handling Patterns

- Validate input as early as possible.
- Let domain logic raise domain-relevant errors.
- Map domain errors to transport responses in one place.
- Wrap upstream failures with operation context.
- Preserve the original cause when rethrowing or translating errors.

Do not catch broad errors unless you either:

1. Add meaningful context and rethrow, or
2. Convert them at a system boundary.

---

## Logging Expectations

Whenever an error is logged, include:

- Operation or handler name
- Request or job identifier when available
- Relevant resource identifier
- Error category
- Safe diagnostic details

Do not log access tokens, passwords, private keys, full user secrets, or entire request
payloads by default.

---

## Examples

No backend implementation exists yet. The first real backend task should add examples
from concrete files.
