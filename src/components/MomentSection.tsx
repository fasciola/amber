import { useRef } from 'react'
import type { DayMoment } from '../types'
import { RitualSection } from './sections/RitualSection'
import { ImmersiveSection } from './sections/ImmersiveSection'
import { CollageSection } from './sections/CollageSection'
import { EditorialSection } from './sections/EditorialSection'
import { NightfallSection } from './sections/NightfallSection'

interface MomentSectionProps {
  moment: DayMoment
  nextTheme?: DayMoment['theme']
  /** Previous section's outgoing color (top blend zone — see SectionShell). */
  prevBlend?: string
}

/** Dispatches a moment to its layout renderer (`moment.layout`). */
export function MomentSection({ moment, nextTheme, prevBlend }: MomentSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const props = { moment, nextTheme, prevBlend, sectionRef }
  switch (moment.layout) {
    case 'ritual':
      return <RitualSection {...props} />
    case 'immersive':
      return <ImmersiveSection {...props} />
    case 'collage':
      return <CollageSection {...props} />
    case 'editorial':
      return <EditorialSection {...props} />
    case 'nightfall':
      return <NightfallSection {...props} />
  }
}
