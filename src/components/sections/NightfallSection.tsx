import { SectionShell } from '../SectionShell'
import { MomentCopy } from '../MomentCopy'
import { SlotImage } from '../SlotImage'
import { NewsletterForm } from '../NewsletterForm'
import { DawnGate } from '../ShaderBackdrop'
import type { MomentLayoutProps } from './RitualSection'

/** Nightfall — the dark closing beat: quiet copy, a dim strip of prints, and the newsletter form. */
export function NightfallSection({ moment, nextTheme, prevBlend, sectionRef }: MomentLayoutProps) {
  const strip = moment.images.filter((i) => i.slot === 'strip')
  return (
    <SectionShell moment={moment} nextTheme={nextTheme} prevBlend={prevBlend} sectionRef={sectionRef}>
      <DawnGate kind="stars" variant="stars" sectionRef={sectionRef} colors={[moment.theme.bg, moment.theme.ink, moment.theme.subtle]} />
      <MomentCopy moment={moment} />
      {strip.length > 0 ? (
        <div className="moment__strip">
          {strip.map((item, i) => (
            <SlotImage key={i} item={item} className="moment__img--strip" sectionRef={sectionRef} order={i + 1} />
          ))}
        </div>
      ) : null}
      <NewsletterForm theme={moment.theme} />
    </SectionShell>
  )
}
