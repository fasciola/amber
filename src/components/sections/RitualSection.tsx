import type { RefObject } from 'react'
import type { DayMoment, MomentTheme } from '../../types'
import { siteConfig } from '../../config'
import { luminance } from '../../lib/color'
import { effectiveTheme } from '../../lib/theme'
import { SectionShell } from '../SectionShell'
import { MomentCopy } from '../MomentCopy'
import { DawnGate } from '../ShaderBackdrop'

export interface MomentLayoutProps {
  moment: DayMoment
  nextTheme?: MomentTheme
  /** Previous section's outgoing color (top blend zone). */
  prevBlend?: string
  sectionRef: RefObject<HTMLElement | null>
}

/** Ritual — a pure-text ceremony: oversized centered type, generous air, no images. */
export function RitualSection({ moment, nextTheme, prevBlend, sectionRef }: MomentLayoutProps) {
  // 晨光 palette: the section's effective base plus the day's next two lights
  // (apricot morning, wheat-gold midday), all config-derived. In the
  // 'first-light' mood the effective theme is the deep blue-gold night-dawn
  // and the copy flips to warm cream.
  const eff = effectiveTheme(moment, siteConfig)
  const dark = eff.bg !== moment.theme.bg
  const idx = siteConfig.moments.findIndex((m) => m.id === moment.id)
  const lightA = siteConfig.moments[idx + 1]?.theme.bg ?? nextTheme?.bg ?? moment.theme.bg
  // lightB is "the day after next" — but a dawn light must never be the night:
  // when that moment is a dark closing theme (e.g. a 3-moment day), fall back
  // to lightA so the horizon band and ripple rims stay luminous.
  const afterNext = siteConfig.moments[idx + 2]?.theme.bg
  const lightB = afterNext && luminance(afterNext) >= 0.35 ? afterNext : lightA
  return (
    <SectionShell moment={moment} nextTheme={nextTheme} prevBlend={prevBlend} extraClass={dark ? 'moment--dawn-dark' : undefined} sectionRef={sectionRef}>
      <DawnGate kind="dawn" variant="dawn" sectionRef={sectionRef} colors={[eff.bg, lightA, lightB]} />
      <MomentCopy moment={dark ? { ...moment, theme: eff } : moment} />
    </SectionShell>
  )
}
