---
name: ferio-design
description: Apply Ferio's restrained grayscale-first product and operations interface language when designing or reviewing frontend screens.
---

# Ferio Design

Use this skill for all Ferio storefront, admin, platform-admin, and operational UI work. The interface should support the product clearly and then disappear.

## Visual Direction

- Start with grayscale: ink `#111114`, secondary ink `#6e6e73`, hairline `#e8e8ea`, subtle surface `#fafafa`, and paper `#ffffff`.
- Introduce color only for semantic meaning: muted emerald for success, amber for pending, rose for errors or cancellations, and gray for neutral progress.
- Use one neutral grotesk type family such as Inter. Build hierarchy with weight, size, line height, and restrained tracking; never mix in decorative serif or script fonts.
- Use generous whitespace. Earn tighter density only in operational tables and data-heavy workflows.

## Components

- Make primary actions black, white-text pill buttons with no shadow, gradient, or decoration.
- Give inputs, cards, and images a consistent small radius near 10px. Avoid sharp corners and oversized bubble shapes.
- Prefer 1px hairline dividers over boxed cards and shadows. Do not use drop shadows, glassmorphism, or gradients.
- Keep product cards image-first and borderless: category, name, then price. Show discounts as small solid-black percentage chips.
- Build admin tables with hairline row dividers, no zebra striping, light uppercase micro-label headers, and muted status pills.
- Keep empty states calm: one clear sentence and one useful action, without illustrations or mascots.
- Use plain text navigation when it is sufficient. If an icon is needed, use a real simple 1.5px line icon; never substitute Unicode glyphs for interface icons.

## Interaction And Copy

- Use motion only to explain interaction or state change: subtle opacity, color, or image scale transitions. Avoid page-load sequences, scroll reveals, bouncing, and spring effects.
- Write direct, active UI copy: `Add to cart`, not `Submit`. Explain errors with what happened and the next action, without marketing language or apologies.
- Preserve established layout and visual patterns when extending an existing Ferio screen instead of introducing a new component style.

## Review Checklist

Before considering a screen complete, check:

- Does the layout still make sense with all non-semantic color removed?
- Is every border, icon, color, and animation carrying useful information?
- Are spacing, radii, typography, and button treatment consistent with the system?
- Are status colors muted and reserved for status or alerts?
- Are tables dense only where the workflow benefits from density, while surrounding sections remain spacious?
- Is the screen usable on narrow mobile widths as well as desktop?
- Are empty, loading, error, and success states clear and action-oriented?
