import { useEffect, useRef, useState } from 'react'
import type { DayMoment } from '../types'
import { readableOn } from '../lib/color'
import { fitBalancedLines } from '../lib/fitLines'
import { useMagnetic } from '../hooks/useMagnetic'

interface TitleFit {
  lines: string[]
  maxWidth: number
}

/**
 * "量体裁衣" title fitting: measure the rendered font with a canvas context,
 * then keep the title on one line whenever it fits inside the viewport minus
 * the breathing room (28px mobile / 80px desktop per side, capped at 1280px);
 * otherwise split at word boundaries into width-balanced lines (DP minimizing
 * the widest line — see lib/fitLines). Recomputed on resize and once webfonts
 * land. Falls back to the raw title (natural wrap) if canvas is unavailable.
 */
function useFittedTitle(title: string) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [fit, setFit] = useState<TitleFit | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return undefined
    let cancelled = false
    const compute = () => {
      if (cancelled) return
      const cs = getComputedStyle(el)
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const fontSize = parseFloat(cs.fontSize) || 16
      const lsRaw = cs.letterSpacing.trim()
      const ls = lsRaw.endsWith('em') ? parseFloat(lsRaw) * fontSize : parseFloat(lsRaw) || 0
      const upper = cs.textTransform === 'uppercase'
      const measure = (s: string) => {
        const t = upper ? s.toUpperCase() : s
        return ctx.measureText(t).width + ls * t.length
      }
      const breath = window.innerWidth <= 900 ? 28 : 80
      const maxWidth = Math.min(window.innerWidth - breath * 2, 1280)
      const fitResult = fitBalancedLines(title, maxWidth, measure)
      if (!cancelled) {
        setFit((prev) =>
          prev && prev.maxWidth === maxWidth && prev.lines.join('␟') === fitResult.lines.join('␟')
            ? prev
            : { lines: fitResult.lines, maxWidth },
        )
      }
    }
    compute()
    let live = true
    document.fonts?.ready.then(() => {
      if (live) compute()
    })
    window.addEventListener('resize', compute)
    return () => {
      cancelled = true
      live = false
      window.removeEventListener('resize', compute)
    }
  }, [title])

  return { ref, fit }
}

/**
 * The shared copy block every layout keeps: handwritten script accent +
 * uppercase display title + body + optional pill CTA. The role contrast
 * (elegant accent vs. strong title) is the editorial signature of the
 * day-arc narrative and stays identical across all five layouts.
 *
 * Entrance choreography: the title lands first and the script accent signs
 * it afterwards; ritual (the opening ceremony) breathes a little longer.
 */
export function MomentCopy({ moment, align = 'center' }: { moment: DayMoment; align?: 'center' | 'left' }) {
  const ctaRef = useMagnetic<HTMLAnchorElement>(4)
  const { ref: titleRef, fit } = useFittedTitle(moment.title)
  const d =
    moment.layout === 'ritual'
      ? { title: 0, script: 0.18, body: 0.32, cta: 0.46 }
      : { title: 0, script: 0.15, body: 0.28, cta: 0.42 }
  return (
    <div className={`moment__content moment__content--${align}`}>
      <p className="moment__script" data-reveal style={{ transitionDelay: `${d.script}s`, color: moment.theme.subtle }}>
        {moment.script}
      </p>
      <h2
        ref={titleRef}
        className="moment__title"
        data-reveal
        data-fit={fit ? (fit.lines.length > 1 ? 'balanced' : 'single') : undefined}
        style={{
          transitionDelay: `${d.title}s`,
          color: moment.theme.ink,
          width: fit ? 'max-content' : undefined,
          maxWidth: fit ? `${fit.maxWidth}px` : undefined,
        }}
      >
        {fit ? (
          <>
            <span className="sr-only">{moment.title}</span>
            {fit.lines.map((line, i) => (
              <span key={i} className="moment__title-line" aria-hidden="true">
                {line}
              </span>
            ))}
          </>
        ) : (
          moment.title
        )}
      </h2>
      <p className="moment__body" data-reveal style={{ transitionDelay: `${d.body}s`, color: moment.theme.subtle }}>
        {moment.body}
      </p>
      {moment.cta ? (
        <a
          ref={ctaRef}
          className="moment__cta"
          data-reveal
          style={{ transitionDelay: `${d.cta}s`, backgroundColor: moment.theme.ink, color: readableOn(moment.theme.ink) }}
          href={moment.cta.href}
        >
          {moment.cta.label}
          <span className="moment__cta-dot" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  )
}
