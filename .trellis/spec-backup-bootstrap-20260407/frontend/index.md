# Frontend Development Guidelines

> Bootstrap rules for frontend work in this repository.

---

## Overview

As of 2026-04-07, this repository contains workflow infrastructure only. There is no
frontend application, no routing system, no styling stack, and no selected client state
library.

These guidelines prevent AI agents from inventing a frontend stack and still provide a
consistent default for the first UI work.

---

## Current Status

| Area | Status | Rule |
|------|--------|------|
| Frontend runtime | Not present yet | Do not invent one implicitly |
| Framework | Not selected | Record the choice before adding it |
| Router | Not selected | Match the chosen framework, not personal preference |
| Styling system | Not selected | Start with one system only |
| State library | Not selected | Prefer local state first |
| UI test stack | Not selected | Add only when the UI becomes real |

---

## Pre-Development Checklist

Read these files before making frontend changes:

1. [Directory Structure](./directory-structure.md)
2. [Component Guidelines](./component-guidelines.md)
3. [State Management](./state-management.md)
4. [Type Safety](./type-safety.md)
5. [Quality Guidelines](./quality-guidelines.md)
6. [Hook Guidelines](./hook-guidelines.md) if the chosen framework is hook-based

If there is still no frontend app in the repository:

1. Confirm the task actually needs frontend code.
2. Record the chosen framework, package manager, and styling approach.
3. Bootstrap the smallest viable UI surface that satisfies the task.
4. Update these guidelines with real file paths once the first UI code lands.

---

## Guidelines Index

| Guide | Description | Status |
|------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Where frontend code should live during bootstrap | Bootstrap default |
| [Component Guidelines](./component-guidelines.md) | Component composition and UI boundaries | Bootstrap default |
| [Hook Guidelines](./hook-guidelines.md) | Shared stateful logic and side-effect rules | Bootstrap default |
| [State Management](./state-management.md) | Local vs shared vs server state | Bootstrap default |
| [Quality Guidelines](./quality-guidelines.md) | Review, accessibility, and verification bar | Bootstrap default |
| [Type Safety](./type-safety.md) | Boundary validation and typed contract rules | Bootstrap default |

---

## Working Rule For AI Agents

When frontend code does not exist yet, prefer this order:

1. Confirm the user-facing requirement.
2. Check whether a frontend already exists.
3. If not, add the minimum UI stack needed for the task.
4. Avoid introducing routing, global state, animation libraries, and design systems all at once.

---

**Language**: All documentation should be written in **English**.
