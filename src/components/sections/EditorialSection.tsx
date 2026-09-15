import { SectionShell } from '../SectionShell'
import { MomentCopy } from '../MomentCopy'
import { SlotImage } from '../SlotImage'
import type { MomentLayoutProps } from './RitualSection'

/** Editorial — a two-column magazine spread: captioned plate left, copy right, small prints at the gutter. */
export function EditorialSection({ moment, nextTheme, prevBlend, sectionRef }: MomentLayoutProps) {
  const main = moment.images.find((i) => i.slot === 'main')
  const secondary = moment.images.filter((i) => i.slot === 'secondary')
  return (
    <SectionShell moment={moment} nextTheme={nextTheme} prevBlend={prevBlend} sectionRef={sectionRef}>
      <div className="moment__spread">
        {main ? <SlotImage item={main} className="moment__img--main" sectionRef={sectionRef} speed={0.012} ease={0.14} order={1} /> : null}
        <MomentCopy moment={moment} align="left" />
      </div>
      {secondary.map((item, i) => (
        <SlotImage
          key={i}
          item={item}
          className={`moment__img--secondary moment__img--secondary-${i}`}
          sectionRef={sectionRef}
          speed={0.014 + i * 0.003}
          ease={0.18 - i * 0.04}
          order={i + 2}
        />
      ))}
    </SectionShell>
  )
}
