# Backend Development Guidelines

> Bootstrap rules for backend work in this repository.

---

## Overview

As of 2026-04-07, this repository contains Trellis and Codex workflow files, but no
application backend code, no backend package manifest, and no committed runtime
service entrypoint.

These guidelines therefore document two things:

1. The current reality: there is no established backend stack yet.
2. The default rules AI agents must follow while bootstrapping one.

Do not claim a framework, language, ORM, or deployment target already exists unless
the repository contains it.

---

## Current Status

| Area | Status | Rule |
|------|--------|------|
| Backend runtime | Not present yet | Do not invent one implicitly |
| API framework | Not selected | Record the choice in task docs before adding it |
| Database | Not selected | Do not add persistence casually |
| Background jobs | Not selected | Add only through an explicit task |
| Observability stack | Not selected | Use simple structured logging first |

---

## Pre-Development Checklist

Read these files before making backend changes:

1. [Directory Structure](./directory-structure.md)
2. [Error Handling](./error-handling.md)
3. [Quality Guidelines](./quality-guidelines.md)
4. [Database Guidelines](./database-guidelines.md) if persistence is involved
5. [Logging Guidelines](./logging-guidelines.md) if a new backend process or request path is added

If the repo still has no backend code when the task starts:

1. Confirm the task really requires backend code.
2. Document the chosen stack in the task PRD or implementation notes.
3. Introduce the smallest viable backend skeleton instead of a full platform rewrite.
4. Update these backend guidelines once the stack becomes real.

---

## Guidelines Index

| Guide | Description | Status |
|------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Where backend code should live during bootstrap | Bootstrap default |
| [Database Guidelines](./database-guidelines.md) | Rules for selecting and using persistence | Bootstrap default |
| [Error Handling](./error-handling.md) | Error categories and boundary behavior | Bootstrap default |
| [Quality Guidelines](./quality-guidelines.md) | Review, testing, and change-size expectations | Bootstrap default |
| [Logging Guidelines](./logging-guidelines.md) | Structured logging and secret-safe logs | Bootstrap default |

---

## Working Rule For AI Agents

When backend code does not exist yet, prefer this order:

1. Discover what the task actually needs.
2. Reuse existing infra if the repo already gained backend files.
3. If nothing exists, add the minimum backend foundation needed for the task.
4. Avoid choosing extra frameworks, layers, or dependencies without a concrete need.

---

**Language**: All documentation should be written in **English**.
