---
name: design-md-reference
description: Use when designing or redesigning TrendX frontend pages and you want concrete visual direction from imported DESIGN.md references. Helps choose a primary design language, extract tokens and component rules, and translate them into real page/UI decisions before or during frontend implementation.
---

# Design MD Reference

Use the bundled `references/catalog.md` first. It lists the imported design references and when each one fits best.

## Workflow

1. Pick one primary reference.
2. Optionally pick one secondary reference for accents or motion.
3. Summarize the chosen direction before editing UI:
   - atmosphere
   - palette
   - typography
   - component treatment
   - layout density
4. Convert the chosen reference into implementation decisions:
   - CSS variables
   - page sections
   - card and table styling
   - button hierarchy
   - responsive behavior

## TrendX Defaults

- Start with `coinbase` when you want trust, clarity, and institutional fintech polish.
- Start with `kraken` when you want a denser, more trading-native dashboard feel.
- Use `revolut` when you want higher-end fintech surfaces and premium dark panels.
- Use `cohere` when the page needs product/AI polish around data-heavy storytelling.
- Use `framer` only as a secondary reference for motion, hero composition, and marketing rhythm.

## Guardrails

- Do not blend more than two references in one page pass.
- Keep one clear primary visual system.
- Prefer dashboard readability over decorative styling.
- Avoid generic purple-on-black defaults unless the chosen reference explicitly justifies them.
- When a reference conflicts with TrendX trading clarity, choose clarity.

## References

- [Catalog](./references/catalog.md)
- [Coinbase](./references/coinbase/DESIGN.md)
- [Kraken](./references/kraken/DESIGN.md)
- [Revolut](./references/revolut/DESIGN.md)
- [Cohere](./references/cohere/DESIGN.md)
- [Framer](./references/framer/DESIGN.md)
