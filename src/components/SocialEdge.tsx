import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { siteConfig } from '../config'
import { useScrollspy } from '../hooks/useScrollspy'
import { SocialMark } from './SocialEntry'

/**
 * "右缘诗签" social edge tag (socialPlacement 'edge', default): a slim
 * vertical frosted ribbon at the viewport's right edge — 1px hairline plus
 * the custom line-art marks stacked. Hover / focus-within pops each handle
 * out to the left as a frosted chip with a stagger; touch starts collapsed
 * (first tap opens, second follows, outside tap closes); reduced-motion
 * shows the handles statically. Leaves the header to the centered logo.
 */
export function SocialEdge() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ids = siteConfig.moments.map((m) => m.id)
  const active = useScrollspy(ids)
  const activeMoment = siteConfig.moments.find((m) => m.id === active) ?? siteConfig.moments[0]

  useEffect(() => {
    if (!open) return undefined
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  // No configured entries → no ribbon at all (an empty frosted shell is worse
  // than no social entry; the shipped sample defaults to clean).
  if (siteConfig.socials.length === 0) return null

  const onTap = (e: React.MouseEvent) => {
    if (window.matchMedia('(hover: none)').matches && !open) {
      e.preventDefault()
      setOpen(true)
    }
  }

  const style = {
    color: `var(--chrome-ink, ${activeMoment.theme.ink})`,
  } as CSSProperties

  return (
    <div ref={ref} className={`social-edge${open ? ' social-edge--open' : ''}`} style={style}>
      <span className="social-edge__rule" aria-hidden="true" />
      {siteConfig.socials.map((s, k) => (
        <a
          key={s.label}
          href={s.href}
          aria-label={`${s.label} ${s.handle ?? ''}`.trim()}
          className="social-edge__link"
          onClick={onTap}
          style={{ '--edge-i': k } as CSSProperties}
        >
          <SocialMark icon={s.icon} iconSvg={s.iconSvg} size={16} />
          {s.handle ? (
            <span className="social-edge__handle" aria-hidden="true">
              {s.handle}
            </span>
          ) : null}
        </a>
      ))}
    </div>
  )
}
