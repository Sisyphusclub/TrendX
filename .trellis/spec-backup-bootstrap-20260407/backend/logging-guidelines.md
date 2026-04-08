# Logging Guidelines

> How backend processes should emit logs in this repository.

---

## Current State

No application logger has been chosen yet. Logging defaults must therefore stay simple,
portable, and secret-safe.

---

## Core Rules

- Prefer structured logs over free-form text when the selected stack supports it.
- Use one logger abstraction per process or service.
- Make log fields predictable across handlers, jobs, and scripts.
- Keep local development logging readable, but do not sacrifice structure in production.

If the stack starts with plain console logging, keep the message format consistent and
upgrade later instead of mixing multiple logging styles immediately.

---

## Minimum Fields

Backend logs should include these fields whenever possible:

- `timestamp`
- `level`
- `service` or process name
- `operation`
- `requestId` or `jobId` when applicable
- `message`

Useful optional fields:

- `userId` only when safe and necessary
- `resourceId`
- `durationMs`
- `errorType`

---

## Log Levels

- `debug`: Local debugging and low-level diagnostics
- `info`: Expected state transitions and successful operations worth tracking
- `warn`: Recoverable failures, degraded behavior, retries, or suspicious input
- `error`: Failed requests, failed jobs, unexpected exceptions, startup failures

Do not use `error` for normal validation failures unless that failure indicates a bug,
abuse pattern, or broken integration.

---

## What Not To Log

Never log:

- Passwords
- Tokens
- Secrets from environment variables
- Full request or response bodies unless a task explicitly requires sanitized capture
- Large object dumps from database records or third-party SDKs

Also avoid duplicate logging of the same failure at multiple layers.

---

## Bootstrap Guidance

When introducing the first backend service:

1. Pick one logging approach.
2. Add request or job correlation identifiers early.
3. Keep log setup centralized.
4. Update this document with the chosen logger and example file paths.
