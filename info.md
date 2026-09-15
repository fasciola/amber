# Day Moments (day-timeline one-pager) — Usage Guide

## Language

The language the site presents should follow the language of the user's query: a Chinese query gets the Chinese version, an English query gets the English version. This repo is the English version (en-US); the same template also has a Chinese version right next to it in the sibling `cn/day-moments` directory (when the environment ships both, pick the one that matches the user's language).

## Before you start: ask the user

Before loading or adapting the site, use the ask_user tool to ask a few questions:

1. **(required) Should the site become a full-stack app?** That is, does it need persistent data storage (a backend + database)? As shipped, the site is a pure static front end: the subscription form only validates on the client — it neither sends nor stores any email address. If the user wants to actually collect subscriptions, persist data, or manage content, it needs to go full-stack; if they only want a presentation page, keep it static.
2. **Content:** keep the sample brand "Alba" and its copy, or replace them with the user's own brand, story, and images?
3. **Palette:** the default is a "warm paper day" sequence (rice paper → apricot → wheat gold → dusk mauve → ink blue, following the hours of the day). Does the user have a palette in mind?
4. **Structure:** how many moments/sections (2–8 supported; five ship as the sample)? Bottom navigation: the sundial dock (default) or the thin arc (`nav.variant: 'arc'`)?
5. **Motion:** keep the full ambient layer (WebGL dawn/stars, dust particles, magnetic buttons, cursor glow), or a lighter version?

If the user gives no answers, load the default site files as-is and change nothing.

Optional: You can use image and video generation tools if it suits user's query.

## What this site is

A "day timeline" narrative one-pager: the sample self-care brand Alba is told through five moments from sunrise to dusk, each moment in its own layout. Pure content customization only requires editing `src/config.ts` (schema in `src/types.ts`); the engine components stay untouched.

```text
index.html            entry (title / font preloads / OG)
src/
  config.ts           all copy, moments, themes, nav, fx toggles — the customization surface
  types.ts            typed configuration schema
  App.tsx / main.tsx  assembly
  styles.css          all styles
  components/         engine components (five layouts, sundial dock nav, edge poem tab, …)
  hooks/              scrollspy, reveal, parallax, magnetic
  lib/                color, theme derivation, config validation, heading line-fit
public/fonts/         self-hosted fonts (SIL OFL)
tests/                vitest config validation + config-aware e2e acceptance matrix
```

Potential uses: any storytelling landing page — brand narrative, product launch timeline, event or festival program, travel itinerary, editorial photo story, holiday campaign. Specific user needs usually mean replacing text, images, and brand details: the copy all lives in `config.ts`; drop new images into `public/` and update the paths in the config. Note the `/media/*.jpg` sample images used in the config are not bundled with the repo; the components have built-in broken-image fallbacks — swap in the user's own images for real use.

If the user just wants to look at the site, load it directly (`npm run dev`, or serve the shipped `dist/` build).

## Tech in brief

- **Config-driven:** the whole site runs on one strongly typed config (`config.ts` + `types.ts`); `lib/validateConfig.ts` validates it at runtime with visible errors. Change content, not the engine.
- **Five layouts:** `ritual` (text-only) / `immersive` (full-bleed photo) / `collage` (2–6 fragments + monospaced time captions) / `editorial` (two-column principal artwork + annotations) / `nightfall` (dark closer + subscription form), dispatched by `MomentSection`.
- **Theming:** each moment carries `bg/bgTo/bgVia`, `ink`, `grain`, `vignette`; `blend.zoneVh` melts neighboring sections together with no seam, and `blend.link` interpolates header/nav colors continuously on scroll.
- **Ambient fx layer (`fx.*`):** a hand-written GLSL WebGL dawn/stars backdrop (`ShaderBackdrop.tsx`: fbm aurora bands, god-ray sweep, water caustics, meteors, pointer ripples, reduced-motion static frame, CSS-gradient fallback); canvas dust particles (one kind per moment: mist / pollen / heat / ember / night); magnetic CTAs, scroll reveals, parallax, cursor glow — every piece individually switchable.
- **Navigation:** `nav.variant: 'dock'` = sundial dock (thin rail, traveling sun, sunset finale), `'arc'` = thin arc progress river; scrollspy, arrow keys, and deep links all supported.
- **Social entry:** `socialPlacement: 'edge'` = right-edge poem tab (expands on hover/focus), `'header'` = header bar; styles chip / poem / handles / marks.
- **Tests:** `npm test` validates the config; `npm run test:e2e` runs a config-aware browser acceptance matrix (auto-skips when Chromium is unavailable; `E2E_BASE` overrides the URL).

Don't look for more detail here — read the code: the schema in `src/types.ts`, layouts in `src/components/sections/`, motion in `ShaderBackdrop.tsx` and `DustField.tsx`.
