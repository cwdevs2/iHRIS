# Performance Page Overrides

> **PROJECT:** iHRIS
> **Generated:** 2026-05-08 10:29:18
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** 1. Hero with video background, 2. Key features overlay, 3. Benefits section, 4. CTA

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Dark overlay 60% on video. Brand accent for CTA. White text on dark.

### Component Overrides

- Avoid: Load everything upfront
- Avoid: No caching strategy
- Avoid: Ignore bundle size growth

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Deal movement animations, metric updates, leaderboard ranking changes, gauge needle movements, status change highlights
- Performance: Lazy load below-fold images and content
- Performance: Set appropriate cache headers
- Performance: Monitor and minimize bundle size
- CTA Placement: Overlay on video (center/bottom) + Bottom section
