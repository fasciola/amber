import { SectionShell } from '../SectionShell'
import { MomentCopy } from '../MomentCopy'
import { SlotImage } from '../SlotImage'
import type { MomentLayoutProps } from './RitualSection'

/** Per-fragment drift: small speeds, independent lag (each fragment settles with its own inertia). */
const FRAG_DRIFT: Array<{ speed: number; ease: number }> = [
  { speed: 0.013, ease: 0.1 },
  { speed: 0.017, ease: 0.16 },
  { speed: 0.015, ease: 0.12 },
  { speed: 0.011, ease: 0.09 },
  { speed: 0.018, ease: 0.18 },
  { speed: 0.014, ease: 0.13 },
]

/**
 * Collage — fragments staggered around an invisible diagonal axis
 * (top-left → bottom-right), sizes alternating along it, each carrying a
 * mono hour-note; the copy block anchors the middle of the axis.
 */
export function CollageSection({ moment, nextTheme, prevBlend, sectionRef }: MomentLayoutProps) {
  const frags = moment.images.filter((i) => i.slot === 'frag')
  return (
    <SectionShell moment={moment} nextTheme={nextTheme} prevBlend={prevBlend} sectionRef={sectionRef}>
      {frags.map((item, i) => (
        <SlotImage
          key={i}
          item={item}
          className={`moment__img--frag moment__img--frag-${i}`}
          sectionRef={sectionRef}
          speed={FRAG_DRIFT[i % FRAG_DRIFT.length].speed}
          ease={FRAG_DRIFT[i % FRAG_DRIFT.length].ease}
          order={i + 1}
        />
      ))}
      <MomentCopy moment={moment} />
    </SectionShell>
  )
}
