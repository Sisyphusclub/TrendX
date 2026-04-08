# TrendX DESIGN.md

## 1. Visual Theme & Atmosphere

TrendX should feel like an operator-grade crypto execution desk for a single serious trader,
not a retail casino and not a generic AI dashboard. The product needs institutional trust,
 crisp hierarchy, and enough tension to communicate live market risk.

The visual direction combines:

- **Coinbase as the primary reference** for trust, financial clarity, bright surfaces, and strong blue interaction language.
- **Cohere as the secondary reference** for rounded containment, editorial typography contrast, and polished product storytelling.

The overall atmosphere is:

- bright command center
- institutional but not sterile
- precise, calm, and high-conviction
- data-dense with generous breathing room

Avoid the look of a generic "AI dark dashboard". TrendX should be memorable because it feels like a refined execution terminal with a product point of view.

## 2. Color Palette & Roles

### Primary

- **Signal Blue** `#0B57F0`
  - primary actions, links, active states, key metrics
- **Ink** `#0D1321`
  - strongest text, main structural lines
- **Canvas** `#F6F8FC`
  - app background
- **Surface** `#FFFFFF`
  - primary cards and modules

### Secondary

- **Cloud Border** `#D8DEE8`
  - borders, separators, subtle strokes
- **Muted Text** `#64748B`
  - secondary labels and metadata
- **Soft Blue Surface** `#EAF1FF`
  - cool tinted surfaces for summary modules
- **Night Panel** `#111827`
  - selective dark callout zones only

### Trading Semantics

- **Bull** `#168A5C`
  - positive trend, active long bias, healthy confirmation
- **Bear** `#CC3D3D`
  - negative trend, short bias, exits, kill risk
- **Wait** `#B7791F`
  - stand-by states, caution, low conviction
- **Highlight Mint** `#C8F169`
  - rare accent for confirmation progress and key system signals

## 3. Typography Rules

### Font Families

- **Display**: `Bricolage Grotesque`
  - used for hero statements and major section headings
- **Body / UI**: `Manrope`
  - used for cards, labels, tables, metadata, buttons
- **Mono**: `IBM Plex Mono`
  - used for symbols, cadence labels, execution states, compact meta text

### Hierarchy

| Role | Font | Size | Weight | Notes |
|------|------|------|--------|-------|
| Hero Display | Bricolage Grotesque | 64-84px | 600 | tight, high impact |
| Section Display | Bricolage Grotesque | 32-44px | 600 | strong but compact |
| Card Title | Manrope | 20-26px | 700 | crisp operational emphasis |
| Metric Value | Manrope | 28-40px | 700 | dense financial readout |
| Body | Manrope | 15-18px | 500 | neutral and readable |
| Metadata | Manrope | 12-14px | 600 | secondary system labels |
| Mono Label | IBM Plex Mono | 11-13px | 500 | uppercase tracking |

## 4. Component Stylings

### Cards

- Main cards use white or faintly tinted surfaces.
- Radius should be generous: `22px` to `30px`.
- Borders should be light and cool, not heavy shadows.
- Nested cards should be avoided unless they convey a real structural boundary.

### Buttons

- Primary buttons use Signal Blue with rounded pill shape.
- Secondary buttons use white/transparent backgrounds with blue or ink borders.
- Status pills can use tinted semantic backgrounds.

### Data Blocks

- Metrics should feel like instruments, not marketing tiles.
- Use clear labels, strong figures, and compact contextual metadata.
- Confirmation progress should use restrained fills and exact percentages.

## 5. Layout Principles

- Use asymmetry at the page level, clarity within modules.
- Hero section should establish system purpose and state quickly.
- Risk and control information should appear before lower-priority detail.
- Pair cards should read top-to-bottom in this order:
  - direction and action
  - price context
  - confirmation confidence
  - execution plan
  - protection targets

## 6. Depth & Elevation

- Depth comes from surface contrast and border precision, not blur-heavy glass.
- Use one or two selective dark panels for emphasis, not the entire app shell.
- Shadows should be soft and broad, never muddy.

## 7. Do's and Don'ts

### Do

- make the dashboard feel institutional and operator-ready
- keep blue as the dominant action color
- use semantic trading colors only when they carry real meaning
- give major data points room to breathe
- use mono labels sparingly to reinforce system credibility

### Don't

- don't default to purple neon crypto aesthetics
- don't make every section a card inside another card
- don't rely on glow effects for importance
- don't use decorative charts that carry no information
- don't center long blocks of text

## 8. Responsive Behavior

- Mobile should keep the same hierarchy, not hide the important controls.
- Hero condenses into a stacked summary block.
- Risk module should remain near the top on all viewports.
- Pair cards should shift from multi-column internals to stacked blocks cleanly.
- Touch targets must remain at least 44x44.

## 9. Agent Prompt Guide

When generating TrendX UI:

- Start from a bright financial command center.
- Use Coinbase-like clarity and Cohere-like rounded containment.
- Keep the app feeling serious, strategic, and market-aware.
- Prefer white and cool blue surfaces with selective dark emphasis.
- Use Bricolage Grotesque for display, Manrope for interface text, IBM Plex Mono for system metadata.
