import { siteConfig } from '../config'
import { useScrollspy } from '../hooks/useScrollspy'
import { withAlpha } from '../lib/color'
import { effectiveTheme } from '../lib/theme'
import { SocialRow } from './SocialEntry'
import type { CSSProperties } from 'react'

export function SiteHeader() {
  const ids = siteConfig.moments.map((m) => m.id)
  const active = useScrollspy(ids)
  const activeMoment = siteConfig.moments.find((m) => m.id === active) ?? siteConfig.moments[0]
  const theme = effectiveTheme(activeMoment, siteConfig)
  // Header ink follows the active moment's effective theme so the fixed chrome
  // stays legible across the whole day arc (first-light dark → ink blue). A
  // soft veil keeps display titles from colliding with the logo while they
  // scroll underneath. When `blend.link` is on, both are continuous CSS vars
  // driven by scroll position (useChromeLink); the inline values are the
  // static fallback.
  const headerStyle = {
    color: `var(--chrome-ink, ${theme.ink})`,
    '--header-veil': `var(--chrome-veil-header, ${withAlpha(theme.bg, 0.66)})`,
  } as CSSProperties
  return (
    <header className="site-header" style={headerStyle}>
      {(siteConfig.socialPlacement ?? 'edge') === 'header' && siteConfig.socials.length > 0 ? (
        <SocialRow className="site-header__social" />
      ) : (
        <div className="site-header__social" aria-hidden="true" />
      )}
      <a className="site-header__logo" href="#top">
        {siteConfig.brandName}
      </a>
      <div className="site-header__right" aria-hidden="true" />
    </header>
  )
}
