/* Typed configuration surface — ordinary adaptations edit src/config.ts only. */

export interface MediaImage {
  src: string
  alt: string
  /** CSS object-position, e.g. '50% 30%'. Optional. */
  position?: string
}

export interface MomentCta {
  label: string
  href: string
}

export interface MomentTheme {
  /** Section background color (top when bgTo is set). */
  bg: string
  /** Optional second color — renders a vertical gradient from bg to bgTo. */
  bgTo?: string
  /** Primary text color on the background. */
  ink: string
  /** Secondary/muted text color on the background. */
  subtle: string
  /** Paper-grain opacity, 0–1 (engine default 0.45). Procedural texture layer. */
  grain?: number
  /** Edge-vignette strength, 0–1 (engine default 0.2). Tinted with `ink`. */
  vignette?: number
  /**
   * Optional midpoint color for the bottom blend — renders the section-out
   * gradient as bg → bgVia → (bgTo ?? next.bg) instead of a direct two-stop
   * ramp, so hue-distant neighbours (gold → mauve) hand off through a staged
   * midpoint instead of a muddy straight line.
   */
  bgVia?: string
}

/**
 * Section layout — the rhythm of the narrative. Each moment picks one;
 * the shipped sample uses all five, one per moment.
 *
 * - `ritual`    pure-text ceremony: oversized centered type, no images
 * - `immersive` full-bleed photograph pressed under a floating copy layer
 * - `editorial` two-column magazine spread: captioned image left, copy right
 * - `collage`   fragments staggered around an invisible diagonal axis, copy at its centre
 * - `nightfall` dark closing section: dim image strip + newsletter form
 */
export type MomentLayout = 'ritual' | 'immersive' | 'editorial' | 'collage' | 'nightfall'

/**
 * Image slots are interpreted per layout:
 * - immersive: `bg` (exactly 1), `inset` (0–1, small framed card w/ optional caption)
 * - editorial: `main` (exactly 1, captioned), `secondary` (0–2, stacked)
 * - collage:   `frag` (2–6, axis-staggered fragments; caption renders as a mono hour-note)
 * - nightfall: `strip` (0–4, dim horizontal strip)
 * - ritual:    no images
 */
export type MomentImageSlot = 'bg' | 'inset' | 'main' | 'secondary' | 'frag' | 'strip'

export interface MomentImage {
  image: MediaImage
  slot: MomentImageSlot
  /** Small note under the image (meaningful on `main` and `inset` slots). */
  caption?: string
}

/**
 * Particle family ("时尘" — the hour made visible) rendered over the section
 * on the dust canvas. Each kind has its own motion language:
 * - `dust`   generic quiet motes (engine default when no kind is set)
 * - `mist`   morning-mist light dust: large soft haze blobs, slow rise
 * - `pollen` pollen / dandelion down: light tufts swaying on a breeze
 * - `heat`   midday heat shimmer: fine bright glints, fast twinkle, rising
 * - `ember`  golden-hour glow motes: big warm soft orbs, ultra-slow drift
 * - `night`  dusk stars + fireflies: breathing star field, wandering lit trails
 */
export type ParticleKind = 'dust' | 'mist' | 'pollen' | 'heat' | 'ember' | 'night'

export interface MomentParticles {
  /** Particle family for this moment (default 'dust'). */
  kind?: ParticleKind
  /** Particle count multiplier 0.5–2 (default 1). */
  density?: number
  /** Particle tint hex color (default: the moment's effective ink). */
  tint?: string
  /** Motion speed multiplier 0.2–2 (default 1). */
  speed?: number
}

export interface DayMoment {
  /** Unique kebab-case id; drives anchor + scrollspy (#<id>). */
  id: string
  /** Short label shown on the nav marker. */
  label: string
  /** Handwritten script accent word/phrase. */
  script: string
  /** Uppercase display title. */
  title: string
  /** Body copy (1–3 short paragraphs, joined with blank lines). */
  body: string
  cta?: MomentCta
  /** Section layout — see MomentLayout. Required. */
  layout: MomentLayout
  images: MomentImage[]
  theme: MomentTheme
  /**
   * Optional particle family for this moment's dust canvas ("时尘") — binds
   * the ambient particles to the hour's character. Default: generic 'dust'.
   */
  particles?: MomentParticles
}

export interface SocialLink {
  label: string
  href: string
  /** Built-in line-art mark. Required unless `iconSvg` is given. */
  icon?: 'instagram' | 'tiktok' | 'youtube' | 'x' | 'facebook'
  /** Mono lowercase handle (e.g. '@alba.rituals') — required in `handles` social style. */
  handle?: string
  /**
   * Custom line-art icon as inline SVG inner markup (path/circle/rect elements).
   * Rendered in the same 24×24, 1.4px-stroke, currentColor frame as the built-in
   * marks, so it inherits the active theme ink. This is the config-level way to
   * add platforms outside the built-in set (e.g. 微信/小红书/微博/抖音/B站) —
   * no engine edit. Do NOT paste official logo geometry; draw a stylised mark.
   */
  iconSvg?: string
}

/** Social entry presentation: frosted expanding chip (default), vertical poem-tag, plain typographic handles, or refined line marks. */
export type SocialStyle = 'chip' | 'poem' | 'handles' | 'marks'

/** Quiet-luxury motion layer — each effect individually switchable. */
export interface FxConfig {
  /** Slow drifting dust motes per section, tinted with the theme ink (default true; reduced-motion renders one static frame). */
  dust?: boolean
  /** Magnetic hover on the primary CTAs (±4px follow + spring back; default true; touch/reduced-motion off). */
  magnet?: boolean
  /** Section titles develop from blur to sharp on reveal (default true). */
  develop?: boolean
  /** The arc sun traveller leaves a fading pulse trail (default true; reduced-motion off). */
  pulse?: boolean
  /** Collage fragments add an ultra-slow independent drift layered over parallax (default true). */
  drift?: boolean
  /** A large soft glow follows the cursor, tinted with the current theme (default true; touch/reduced-motion off). */
  glow?: boolean
  /**
   * "晨光" dawn shader behind the ritual section: slow aurora bands, two
   * drifting light blobs, micro sparkle, center kept calm for readability
   * (default true; reduced-motion renders one static frame; CSS gradient twin
   * when WebGL is unavailable).
   */
  dawn?: boolean
  /** Sparse night stars behind the nightfall section, same engine at lower intensity (default true). */
  stars?: boolean
  /** Cursor position gently pulls the dawn light blobs' centre of gravity, and in-section scroll warms the light (default true). */
  dawnCursor?: boolean
  /**
   * Dawn color mood: 'first-light' (default) renders the pre-dawn scene —
   * deep blue-gold darkness with luminous light playing through it, text and
   * chrome derived to a warm cream; 'bright' keeps a bright-paper look.
   */
  dawnMood?: 'first-light' | 'bright'
  /** Dawn/stars strength 0–1 (default 0.85; stars render at ~55% of it). */
  dawnIntensity?: number
  /** Dawn/stars flow speed multiplier 0.2–2 (default 1; also scales the sweep/caustics/meteor clocks). */
  dawnSpeed?: number
  /** God-ray sweep: one very slow diagonal light band crossing the dawn scene (~83s lap, drifting angle; default true). */
  sweep?: boolean
  /** Caustics ripples: small water-light filigree breathing in patches (default true). */
  caustics?: boolean
  /** Rare meteor with a fading tail in the night-stars variant (~22s cycle; default true). */
  meteor?: boolean
  /**
   * Horizon band: a warm-gold first-light glow low over the scene bottom that
   * slowly rises and swells as you scroll through the section, like the sun
   * arriving (default true; first-light mood only).
   */
  horizon?: boolean
  /** Horizon rest height as a fraction from the scene bottom, 0–0.5 (default 0.08; scroll lifts it up to +0.22). */
  horizonY?: number
  /** Horizon glow strength 0–1 (default 0.55). */
  horizonGain?: number
  /** Light breath: the main dawn band swells and rests on an ~8s cycle, caustics follow a third-cycle later (default true). */
  breath?: boolean
  /**
   * Interactive ripples ("晨光水面"): pointer/touch presses and drags raise
   * analytic ring waves on the dawn scene — the light field refracts along
   * the wavefront and a gold rim rides it (default true; ≤12 concurrent,
   * 3–6s decay, calm-masked around the copy; reduced-motion disables).
   */
  ripple?: boolean
  /** Ripple strength 0–1 (default 0.7) — scales refraction displacement and rim light. */
  rippleGain?: number
}

export interface NavConfig {
  /**
   * Arc apex lift of the bottom progress river, in vw units (1–16, default 8).
   * The arc is measured against the real viewport, so this stays true on resize.
   */
  arcRiseVw?: number
  /** Breathing glow on the active marker (default true; reduced-motion always disables it). */
  breathe?: boolean
  /** ArrowLeft/ArrowRight move between moments when a marker is focused (default true). */
  keys?: boolean
  /**
   * Progress stroke + sun traveller follow the in-section scroll position
   * continuously instead of jumping per moment (default true;
   * reduced-motion keeps per-moment instant jumps).
   */
  follow?: boolean
  /**
   * Day's-end sunset: as the footer scrolls in, the sun sinks out of sight
   * and the nav light fades (default true; reduced-motion keeps it static).
   */
  sunset?: boolean
  /**
   * Navigation form: 'dock' (default) — the "日晷坞" frosted bottom dock with
   * all moment labels always visible and the sun travelling a thin rail;
   * 'arc' — a thin arc progress river (kept as a full fallback).
   */
  variant?: 'dock' | 'arc'
  /** Dock only: keep every moment label visible (default true; false shows only the active label, like the arc). */
  labels?: boolean
  /** Dock only: bar tone — 'veil' (default, theme-tinted translucent glass) or 'solid' (fixed deep bar). */
  dockTone?: 'veil' | 'solid'
}

export interface BlendConfig {
  /**
   * Incoming blend-zone height at each section's top, in vh (0–40, default 26).
   * The previous section's outgoing color melts into the new section over this
   * zone, so no seam line forms between moments (or before the footer). 0 disables.
   */
  zoneVh?: number
  /**
   * Scroll-linked chrome interpolation: header/arc-nav ink and veil colors
   * follow the scroll position continuously between neighbouring themes
   * instead of switching per moment (default true; reduced-motion keeps
   * per-moment static colors).
   */
  link?: boolean
}

export interface SiteCopy {  skipLink: string
  navAria: string
  newsletter: {
    heading: string
    script: string
    placeholder: string
    submitLabel: string
    submitAria: string
    successText: string
    invalidText: string
  }
  footer: {
    tagline: string
    smallLinks: Array<{ label: string; href: string }>
    copyright: string
  }
}

export interface SiteConfig {
  /** BCP-47 locale, e.g. 'en-US'. */
  locale: string
  siteTitle: string
  siteDescription: string
  brandName: string
  socials: SocialLink[]
  /** Social entry presentation (default 'chip'; every style except 'marks' requires a handle per social). */
  socialStyle?: SocialStyle
  /** Where the header social entry lives: 'edge' (default — the floating right-edge poem tag) or 'header' (top-left of the header bar). */
  socialPlacement?: 'edge' | 'header'
  /** 2–8 moments; order is the narrative order. */
  moments: DayMoment[]
  /** Bottom arc progress-river parameters. Optional; engine defaults apply. */
  nav?: NavConfig
  /** Section-transition blend parameters. Optional; engine defaults apply. */
  blend?: BlendConfig
  /** Quiet-luxury motion layer. Optional; each effect defaults on and can be disabled individually. */
  fx?: FxConfig
  copy: SiteCopy
}
