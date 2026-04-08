# Component Guidelines

> How UI components should be built in this repository.

---

## Overview

No UI framework has been selected yet. These rules apply to the first component-based
frontend code added to the repository.

---

## Component Structure

- Prefer one primary component per file.
- Keep route or page shells separate from reusable UI components.
- Move data fetching, persistence, and heavy side effects out of presentational components.
- Split components when they have more than one clear responsibility.

If the selected framework is not component-based, map these principles to its equivalent
view structure and update this file.

---

## Props And Inputs

- Make inputs explicit and minimal.
- Prefer descriptive names over boolean flag combinations.
- If a component needs many mutually exclusive modes, consider separate components.
- Pass domain data in a stable shape instead of leaking raw transport responses deep into the UI.

For typed stacks, type component inputs explicitly. For untyped stacks, validate important
boundary data before it reaches shared UI.

---

## Composition Rules

- Compose small components into feature sections instead of building giant page files.
- Keep shared components generic enough to be reusable, but not abstract for abstraction's sake.
- Feature-specific components should stay close to the feature that owns them.
- Avoid "god components" that fetch data, manage many states, and render unrelated concerns.

---

## Styling Patterns

- Choose one primary styling system per frontend app.
- Keep design tokens or theme constants centralized once they exist.
- Avoid mixing multiple styling systems in the same feature without a strong reason.
- Inline styles should be reserved for simple dynamic values or framework-specific needs.

The first UI task that chooses a styling system should update this file with the actual
pattern used in code.

---

## Accessibility

- Use semantic elements first.
- All interactive elements must be keyboard accessible.
- Inputs need labels or equivalent accessible names.
- Visual-only state should also have programmatic meaning where relevant.
- Dialogs, menus, and popovers need focus handling if they are introduced.

---

## Common Mistakes To Avoid

- Components coupled directly to remote API response shapes
- Reusable components containing feature-only business rules
- Missing loading, empty, and error states
- Styling decisions duplicated per component without shared tokens
- Large page components that should be split into smaller owned pieces
