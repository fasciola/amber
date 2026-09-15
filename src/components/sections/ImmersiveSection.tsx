import { SectionShell } from '../SectionShell'
import { MomentCopy } from '../MomentCopy'
import { SlotImage } from '../SlotImage'
import { SafeImage } from '../SafeImage'
import { useParallax } from '../../hooks/useParallax'
import type { MomentLayoutProps } from './RitualSection'

/** Immersive — full-bleed photograph pressed to the base, copy floating on a paper panel. */
export function ImmersiveSection({ moment, nextTheme, prevBlend, sectionRef }: MomentLayoutProps) {
  const bg = moment.images.find((i) => i.slot === 'bg')
  const inset = moment.images.find((i) => i.slot === 'inset')
  const bgRef = useParallax<HTMLDivElement>(sectionRef, 0.018, 0.12)
  return (
    <SectionShell moment={moment} nextTheme={nextTheme} prevBlend={prevBlend} sectionRef={sectionRef}>
      {bg ? (
        <figure className="moment__img moment__img--bg">
          <div className="moment__img-frame">
            <div className="moment__img-px" ref={bgRef}>
              <SafeImage image={bg.image} loading="eager" />
            </div>
          </div>
        </figure>
      ) : null}
      <span className="moment__scrim" aria-hidden="true" />
      <MomentCopy moment={moment} align="left" />
      {inset ? <SlotImage item={inset} className="moment__img--inset" sectionRef={sectionRef} speed={0.012} ease={0.16} order={2} /> : null}
    </SectionShell>
  )
}
