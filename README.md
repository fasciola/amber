# Day Moments Template

A day-timeline narrative one-pager — a reusable, config-driven React/Vite template.

Standard customization requires editing only the typed configuration in `src/config.ts`; the engine components do not need to change.

## Run Locally

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build      # tsc -b && vite build
npm run preview
```

Quality gates:

```bash
npm run lint       # eslint
npm run check      # tsc -b (typecheck)
npm test           # vitest run: configuration validation
npm run test:e2e   # browser acceptance matrix; skips automatically when Chromium is unavailable
```

`test:e2e` runs against the development server or preview server. It uses `http://localhost:3004` by default; override it with `E2E_BASE`.
The matrix is **configuration-aware**: it imports `src/config.ts` directly to derive every expected value. Its 64 assertions cover:

- The desktop narrative flow and both bottom-navigation variants. The sundial dock is at most 64px high, keeps section labels at least 12px and at a contrast ratio of at least 4.5, tracks progress and sun position, and animates the sunset arc. The compact arc exposes its rail, progress, and active state and can be selected with one configuration change.
- Contracts for five section layouts: image-free `ritual`, full-bleed `immersive`, counted-fragment `collage` with time captions, principal-artwork `editorial` with annotations, and `nightfall` with an embedded subscription form.
- Section-specific atmospheric colors derived from configuration, reveal entrances, broken-image fallbacks, subscription success and error states, and keyboard operation.
- Regression coverage for docked-title header clearance, veil spacing, content and footer clearance above bottom chrome, minimum section padding, and short 1440x700 viewports.
- Left and right arrow navigation, in-section progress and sun tracking, and sunset-arc dimming.
- Placement-aware social entry points, including the right-edge poem tab DOM position, expansion and collapse, and four header styles.
- Five continuous transition zones with pixel sampling for hard seams, plus scroll-driven color-temperature interpolation at seams and section centers, including reduced-motion behavior.
- The ambient `fx` layer: configuration-derived root classes, visible dust motion, magnetic return, final title-reveal state, pulse trails, fragment drift, and cursor glow.
- Dawn and stars shader canvases, frame movement, WCAG 4.5 text contrast from mood-derived ink, the dark first-light treatment, ring geometry, rising horizon light, breathing oscillation, pointer-generated ripples, bounded analytical behavior, reduced-motion static frames, and the CSS-gradient fallback.
- The mobile bottom dock, full active labels with initial markers, zero horizontal overflow, and six reduced-motion assertions.

## Features

- A timeline narrative containing two to eight moments; the sample contains five, from Sunrise to Dusk
- Five `moment.layout` modes: text-only `ritual`, full-bleed photographic `immersive`, axial `collage` with two to six fragments around an implied diagonal and monospaced time captions, two-column `editorial`, and dark `nightfall` with a moonlit strip and subscription form
- A consistent copy role in every moment: handwritten accent, uppercase heading, body copy, and optional call to action
- A bottom **sundial dock**, selected by the default `nav.variant: 'dock'`: a frosted bar no more than 64px high, a fine rail, five persistent section labels, a continuously traveling sun, and a setting arc. Click, arrow-key, deep-link, and pulse-trail behavior remain available. Set `nav.variant: 'arc'` to use the compact arc instead; mobile shows the active full label plus initial markers, and navigation color interpolates during scrolling.
- Per-section atmosphere colors. `theme` supports `bgTo` gradients and bidirectional `bgVia` midpoint transitions, while `theme.grain/vignette` adds procedural SVG grain and an ink-tinted vignette. Bidirectional blend zones controlled by `blend.zoneVh` avoid hard seams; `blend.link` keeps the header and arc-navigation colors continuous, and a themed header veil prevents title collisions.
- A **right-edge poem tab** social entry point, enabled by the default `socialPlacement: 'edge'`: a vertical frosted tab with a hairline and custom single-line mark that expands handle chips on hover or focus. Touch layouts collapse it to a small tab above the dock. Alternative `socialStyle` values are `chip`, `poem`, `handles`, and `marks`; set placement to `header` to place it in the header.
- An individually configurable ambient motion layer under `fx.*`: a dawn-water WebGL shader for ritual sections with aurora bands, concentrated golden light, god rays, caustic ripples, illuminated dust, a scroll-rising horizon band, an eight-second light breath, and interactive multi-wave ripples; a calm mask and text shadow instead of geometric overlays; bright-paper and dusk-star variants; reduced-motion static frames; a CSS-gradient fallback; viewport-gated canvas dust; magnetic calls to action; title focus reveals; arc-navigation pulse trails; independent fragment drift; and theme-aware cursor glow
- Coordinated entrances for all five layouts, using a shared signature easing sequence for heading, accent, and image; image hover scaling; consistent 8–16px parallax; independently delayed collage fragments; and animated link underlines, all with reduced-motion fallbacks
- A demo subscription form with client-side success and error states. It appears in `nightfall` when that section exists and otherwise falls back to the footer; the `#newsletter` anchor always resolves.
- Self-hosted Quicksand for the logo, Jost for body text and headings, and Dancing Script for handwritten accents, with CJK fallback fonts

## Structure

```text
src/
├── config.ts              # Primary file for standard customization; typed configuration
├── types.ts               # TypeScript schema for layout, slot, theme, and navigation
├── lib/
│   ├── validateConfig.ts  # Runtime validation with visible errors and layout-slot contracts
│   └── color.ts           # Hex, luminance, and alpha utilities
├── components/
│   ├── SiteHeader.tsx     # Header colored by the current section theme
│   ├── TimelineNav.tsx    # Bottom arc progress navigation with scrollspy
│   ├── MomentSection.tsx  # Layout dispatcher
│   ├── SectionShell.tsx   # Section shell for theme, gradients, and paper texture
│   ├── MomentCopy.tsx     # Shared accent, heading, body, and call-to-action block
│   ├── SlotImage.tsx      # Image slot with reveal, parallax, captions, and fallback
│   ├── NewsletterForm.tsx # Demo subscription form
│   ├── SiteFooter.tsx     # Compact footer; hosts the form when nightfall is absent
│   └── sections/          # Ritual, Immersive, Collage, Editorial, and Nightfall
├── hooks/                 # Scrollspy, scroll reveal, and parallax
└── styles.css             # All styles
public/
├── media/                 # Sample images in 1200px and 600px variants
└── fonts/                 # Quicksand, Jost, and Dancing Script under the SIL OFL
tests/
├── validateConfig.test.ts
└── e2e/matrix.mjs         # Configuration- and variant-aware matrix with 64 assertions
```

## Demo Boundaries

- The subscription form performs client-side validation only. It has no server and neither sends nor stores email addresses.
- Background audio is intentionally omitted. See `info.md` for component-level extension guidance.
