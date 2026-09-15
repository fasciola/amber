import type { DayMoment, MomentTheme, SiteConfig } from '../types'

/* Local copy (kept import-free so the node-side matrix can import this file
   directly — node's native TS loader resolves no extensionless imports). */
function mixHex(a: string, b: string, t: number): string {
  const h = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const A = h(a)
  const B = h(b)
  const c = (x: number, y: number) => Math.round(Math.min(255, Math.max(0, x + (y - x) * t)))
  return `#${[c(A.r, B.r), c(A.g, B.g), c(A.b, B.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Effective display theme for a moment. Almost always the config theme —
 * except when the ritual section runs the dawn shader in 'first-light' mood:
 * then the shader paints a pre-dawn dark scene, so text, chrome, and the nav
 * veil derive to a luminous-dark palette (deep blue-gold base, warm cream
 * ink). Section `backgroundColor` stays the config value everywhere else
 * (gradients, palette contract); this is the display layer above it.
 *
 * Pure (config passed in) so both the app and the node-side matrix can use it.
 */
export function effectiveTheme(moment: DayMoment, config: SiteConfig): MomentTheme {
  const fx = config.fx ?? {}
  const mood = fx.dawnMood ?? 'first-light'
  if (moment.layout === 'ritual' && fx.dawn !== false && mood === 'first-light') {
    const lastBg = config.moments[config.moments.length - 1]?.theme.bg ?? '#222a3c'
    return {
      ...moment.theme,
      // deep blue-gold base: the day's night leaning on a breath of paper warmth
      bg: mixHex(lastBg, moment.theme.bg, 0.06),
      ink: mixHex(moment.theme.ink, '#fff6e6', 0.86),
      subtle: mixHex(moment.theme.subtle, '#ead9b8', 0.8),
    }
  }
  return moment.theme
}
