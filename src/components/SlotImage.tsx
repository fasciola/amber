import type { RefObject } from 'react'
import type { MomentImage } from '../types'
import { useParallax } from '../hooks/useParallax'
import { SafeImage } from './SafeImage'

interface SlotImageProps {
  item: MomentImage
  /** Extra class, e.g. 'moment__img--frag moment__img--frag-0'. */
  className: string
  sectionRef: RefObject<HTMLElement | null>
  /** Parallax drift speed; 0 disables the effect. */
  speed?: number
  /** Parallax lag (0–1); below 1 the layer settles behind the scroll. */
  ease?: number
  /** Reveal stagger order. */
  order?: number
  eager?: boolean
}

/**
 * One image inside a moment section: fixed-ratio frame with hover zoom,
 * optional parallax drift, optional small caption under the frame.
 * On `frag` slots the caption renders as a mono hour-note (时辰小注).
 * Renders the `.moment__img` / `.img-fallback` contract the matrix checks.
 */
export function SlotImage({ item, className, sectionRef, speed = 0, ease = 1, order = 0, eager = false }: SlotImageProps) {
  const layerRef = useParallax<HTMLDivElement>(sectionRef, speed, ease)
  return (
    <figure className={`moment__img ${className}`} data-reveal style={{ transitionDelay: `${0.07 * order}s` }}>
      <div className="moment__img-frame">
        <div className="moment__img-px" ref={speed ? layerRef : undefined}>
          <SafeImage image={item.image} loading={eager ? 'eager' : 'lazy'} />
        </div>
      </div>
      {item.caption ? (
        <figcaption className={`moment__caption${item.slot === 'frag' ? ' moment__caption--note' : ''}`}>{item.caption}</figcaption>
      ) : null}
    </figure>
  )
}
