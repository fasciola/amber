import { useEffect, useRef, useState } from 'react'
import { siteConfig } from '../config'
import type { SocialLink } from '../types'

/**
 * Refined single-line social marks — custom 1.4px-stroke line art drawn for
 * this brand (aperture / quaver / frame metaphors), deliberately NOT the
 * official platform logo geometry.
 */
export function SocialMark({ icon, iconSvg, size = 16 }: { icon?: string; iconSvg?: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  // Config-supplied custom mark (e.g. zh-platform line art): same stroke frame,
  // theme-inked via currentColor. Trust level: same as config copy.
  if (iconSvg) {
    return <svg {...props} dangerouslySetInnerHTML={{ __html: iconSvg }} />
  }
  switch (icon) {
    case 'instagram':
      // aperture: hand-drawn outer circle + open inner lens arc + tiny dot
      return (
        <svg {...props}>
          <path d="M12 4.1c4.3 0 7.9 3.5 7.9 7.9s-3.5 7.9-7.9 7.9-7.9-3.5-7.9-7.9 3.5-7.9 7.9-7.9Z" />
          <path d="M12 8.6a3.4 3.4 0 1 1-3.4 3.4" />
          <circle cx="16.7" cy="7.3" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'tiktok':
      // quaver: single flowing stroke
      return (
        <svg {...props}>
          <path d="M13.8 4.5v9.7a3.4 3.4 0 1 1-3.4-3.4" />
          <path d="M13.8 4.5c.5 2.6 2.1 4.2 4.7 4.6" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...props}>
          <rect x="4" y="6.5" width="16" height="11" rx="3" />
          <path d="M10.5 9.8v4.4l4-2.2z" />
        </svg>
      )
    case 'x':
      return (
        <svg {...props}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )
    case 'facebook':
      return (
        <svg {...props}>
          <path d="M14.8 4.5h-1.6a3.2 3.2 0 0 0-3.2 3.2v2H7.8v2.6h2.2v7.2h2.7v-7.2h2.3l.5-2.6h-2.8V7.9c0-.6.4-.9 1-.9h1.1z" />
        </svg>
      )
    default:
      return null
  }
}

/**
 * "连语" chip (default socialStyle): one frosted pill holding the line-art
 * marks. Hover / focus-within expands it along the signature easing — the
 * chip widens and each handle types itself in letter by letter (staggered).
 * Touch devices start collapsed: first tap expands, second tap follows the
 * link, outside tap collapses. Reduced motion shows the expanded state
 * statically.
 */
function SocialChip({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const onTap = (e: React.MouseEvent) => {
    if (window.matchMedia('(hover: none)').matches && !open) {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div ref={ref} className={`social-chip${open ? ' social-chip--open' : ''}${className ? ` ${className}` : ''}`}>
      {siteConfig.socials.map((s, k) => (
        <a
          key={s.label}
          href={s.href}
          aria-label={`${s.label} ${s.handle ?? ''}`.trim()}
          className="social-chip__link"
          onClick={onTap}
        >
          <SocialMark icon={s.icon} iconSvg={s.iconSvg} size={17} />
          {s.handle ? (
            <span className="social-chip__handle" aria-hidden="true">
              {s.handle.split('').map((ch, i) => (
                <span key={i} className="social-chip__ch" style={{ transitionDelay: `${k * 70 + i * 16}ms` }}>
                  {ch}
                </span>
              ))}
            </span>
          ) : null}
        </a>
      ))}
    </div>
  )
}

/**
 * "竖排诗签" (socialStyle 'poem'): a 1px vertical hairline with vertical mono
 * handles beside it; hover/focus slides each tag outward and brightens it.
 * On small screens the vertical handles hide and only the marks remain.
 */
function SocialPoem({ className }: { className?: string }) {
  return (
    <div className={`social-poem${className ? ` ${className}` : ''}`}>
      <span className="social-poem__rule" aria-hidden="true" />
      {siteConfig.socials.map((s) => (
        <a key={s.label} href={s.href} aria-label={`${s.label} ${s.handle ?? ''}`.trim()} className="social-poem__link">
          <SocialMark icon={s.icon} iconSvg={s.iconSvg} size={14} />
          {s.handle ? (
            <span className="social-poem__handle" aria-hidden="true">
              {s.handle}
            </span>
          ) : null}
        </a>
      ))}
    </div>
  )
}

/** One plain typographic entry ('handles' mode): mono label + handle, drawn underline. */
function HandleEntry({ link }: { link: SocialLink }) {
  return (
    <a className="social-link social-link--handle" href={link.href} aria-label={`${link.label} ${link.handle ?? ''}`.trim()}>
      <span className="social-link__site">{link.label}</span>
      {link.handle ? <span className="social-link__handle">{link.handle}</span> : null}
      <span className="social-link__line" aria-hidden="true" />
    </a>
  )
}

/** The social entry shared by the header and the footer; `socialStyle` picks the presentation. Renders nothing when no socials are configured. */
export function SocialRow({ className }: { className?: string }) {
  if (siteConfig.socials.length === 0) return null
  const mode = siteConfig.socialStyle ?? 'chip'
  if (mode === 'chip') return <SocialChip className={className} />
  if (mode === 'poem') return <SocialPoem className={className} />
  return (
    <div className={`social-row${className ? ` ${className}` : ''}`}>
      {siteConfig.socials.map((s) =>
        mode === 'marks' ? (
          <a key={s.label} className="social-link social-link--mark" href={s.href} aria-label={s.label}>
            <SocialMark icon={s.icon} iconSvg={s.iconSvg} size={18} />
          </a>
        ) : (
          <HandleEntry key={s.label} link={s} />
        ),
      )}
    </div>
  )
}
