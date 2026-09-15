import { type CSSProperties, type ReactNode, type RefObject } from 'react'
import type { DayMoment, MomentTheme } from '../types'
import { siteConfig } from '../config'
import { luminance, withAlpha } from '../lib/color'
import { effectiveTheme } from '../lib/theme'
import { DustField } from './DustField'

/** Procedural paper grain (SVG turbulence) — generated once, tinted by blend mode. */
const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")"

/**
 * Layered paper texture: fractal-noise grain (soft-light, works on light and
 * dark themes) + an edge vignette tinted with ink on light sections and with
 * black on dark ones. Intensities come from `theme.grain` / `theme.vignette`.
 */
function PaperTexture({ theme }: { theme: MomentTheme }) {
  const grain = theme.grain ?? 0.45
  const vignette = theme.vignette ?? 0.2
  const edge = luminance(theme.bg) < 0.45 ? '#000000' : theme.ink
  return (
    <>
      <span
        className="paper-vignette"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(ellipse 92% 82% at 50% 42%, transparent 56%, ${withAlpha(edge, vignette * 0.55)} 100%)`,
        }}
      />
      <span className="paper-grain" aria-hidden="true" style={{ backgroundImage: NOISE_URI, opacity: grain * 0.5 }} />
    </>
  )
}

interface SectionShellProps {
  moment: DayMoment
  nextTheme?: MomentTheme
  /** Previous section's outgoing color — melts into this section over the top blend zone. */
  prevBlend?: string
  /** Extra section class (e.g. 'moment--dawn-dark' for the first-light mood). */
  extraClass?: string
  sectionRef: RefObject<HTMLElement | null>
  children: ReactNode
}

/**
 * Common section frame: anchor id, per-moment theme colors with a blend
 * gradient toward the next moment, the paper texture layers, and the
 * `moment moment--<layout>` class contract. When `theme.bgVia` is set the
 * blend becomes a staged three-stop ramp (bg → bgVia → blendTo) so hue-distant
 * neighbours hand off through a midpoint instead of a muddy straight line.
 * The top `.paper-blend` zone (height `blend.zoneVh`) cross-fades the
 * previous section's outgoing color into this one — no seam line, even over
 * the immersive layout's full-bleed photograph.
 */
export function SectionShell({ moment, nextTheme, prevBlend, extraClass, sectionRef, children }: SectionShellProps) {
  const blendTo = moment.theme.bgTo ?? nextTheme?.bg
  const via = moment.theme.bgVia
  const zoneVh = siteConfig.blend?.zoneVh ?? 26
  const style = {
    backgroundColor: moment.theme.bg,
    backgroundImage: via
      ? `linear-gradient(180deg, ${moment.theme.bg} 0%, ${moment.theme.bg} 42%, ${via} 74%, ${blendTo ?? moment.theme.bg} 100%)`
      : `linear-gradient(180deg, ${moment.theme.bg} 0%, ${moment.theme.bg} 55%, ${blendTo ?? moment.theme.bg} 100%)`,
    color: moment.theme.ink,
    '--panel': moment.theme.bg,
  } as CSSProperties
  return (
    <section
      id={moment.id}
      ref={sectionRef}
      className={`moment moment--${moment.layout}${extraClass ? ` ${extraClass}` : ''}`}
      style={style}
      aria-label={moment.label}
    >
      <PaperTexture theme={moment.theme} />
      {prevBlend && zoneVh > 0 ? (
        <span
          className="paper-blend"
          aria-hidden="true"
          style={{ backgroundImage: `linear-gradient(180deg, ${prevBlend} 0%, transparent 100%)`, height: `${zoneVh}vh` }}
        />
      ) : null}
      {blendTo && zoneVh > 0 ? (
        <span
          className="paper-blend-out"
          aria-hidden="true"
          style={{ backgroundImage: `linear-gradient(0deg, ${blendTo} 0%, transparent 100%)`, height: `${zoneVh}vh` }}
        />
      ) : null}
      <DustField
        theme={effectiveTheme(moment, siteConfig)}
        particles={moment.particles}
        sectionRef={sectionRef}
        fadeTop={!!prevBlend && zoneVh > 0}
        fadeBottom={!!blendTo && zoneVh > 0}
      />
      {children}
    </section>
  )
}
