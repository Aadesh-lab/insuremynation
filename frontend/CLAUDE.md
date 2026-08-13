# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173
- `npm run build` — production build into `dist/`
- `npm run preview` — serve the production build
- `npm run images` — regenerate `public/assets/` from the design handoff bundle (requires the handoff files; uses sharp for lossless WebP)

There is no lint or test setup in this project.

## What this is

A pixel-exact React port of the InsureNation design handoff (Vite + React 18 + React Router 6 + Framer Motion). The prime directive: **the visual design is reproduced exactly** — no colour, image, copy, or spacing value may drift from the handoff. Preserve this when editing.

## Architecture

### Styling model (the non-obvious part)

The design prototype sizes everything with inline styles against a 1728px canvas and reshapes it through `[data-r="..."]` media queries. This structure is kept intact:

- **Element styles are inline in JSX**, matching the source design values one-for-one. Do not extract them to CSS classes.
- **All responsive behaviour lives in `src/styles/global.css`**, as `@media` blocks targeting `data-r` attribute names, reproduced verbatim from the design.
- All pages share one CSS bundle, and several `data-r` names mean **different things per page** (`badge`, `srow`, `stitle`, `cimg`, `cgrid`). Page-specific media-query blocks are therefore scoped by a root class on each page: `.p-landing`, `.p-about`, `.p-sub`, plus `.p-sub[data-product="health"]` and `.p-sub[data-page="contact"]`. When adding a `data-r` name, check `global.css` for collisions with other pages.
- `src/styles/components.css` holds hover/focus states the prototype expressed inline.

### Routing and data

- `src/App.jsx` defines all routes. The six insurance pages (`/health-insurance`, `/life-insurance`, etc.) are one component, `src/pages/InsurancePage.jsx`, driven by per-product config in `src/data/products.js`. The `key={product.slug}` on the element (not just the Route) is load-bearing — without it React reuses the instance across product navigations, breaking scroll reveals and leaking form state.
- `src/data/site.js` holds shared constants: brand colours (`BLUE`, `DEEP`, `RED`), contact details, nav links, partner list. Use these instead of hard-coding.

### Shared components

- `src/components/Primitives.jsx` — typography/layout primitives (`Eyebrow`, `SplitHeading`, `Body`, `Field`, …) used on every page.
- `src/components/Reveal.jsx` — scroll-triggered entrance animation primitives. All motion uses the design's easing `cubic-bezier(0.22, 1, 0.36, 1)` (exported as `EASE`); do not introduce other easings. Reveals arm 400px below the fold so content never appears blank while being read; stagger/duration ceilings are enforced inside the primitives. `prefers-reduced-motion` disables all entrance animation. Animated elements must settle at exactly the position/scale/colour the design specifies.

### Images

- `public/assets/` is generated output (lossless WebP + SVG icons) — regenerate via `npm run images` rather than editing files by hand.
- The handoff's hero and cover-art photos carried a blue gradient-map treatment. These have since been replaced with the natural photography, so no image in `public/assets/` is duotoned. `scripts/blue-duotone-lut.json` is that treatment recovered from the handoff and `duotone: true` in `scripts/convert-images.mjs` still applies it, but no entry sets the flag — both are kept only in case a treated image has to be rebuilt from raw source.
- The natural replacements were encoded from stock PNGs that are no longer in the tree, at the pixel dimensions of the duotoned files they replaced, so framing matches. They are lossy WebP (q90) rather than the lossless q100 the rest of `public/assets/` uses, and `npm run images` will not reproduce them.
