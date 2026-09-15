import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { siteConfig } from '../config'
import { useScrollspy } from '../hooks/useScrollspy'
import { withAlpha } from '../lib/color'
import { effectiveTheme } from '../lib/theme'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * The sun does not ride a flat line — it follows a shallow day-arc: low at
 * dawn and dusk, lifting toward midday (solar-noon metaphor, ±~30% of its
 * rest height). `t` is the day fraction along the measured stop span (0 at the
 * first stop, 1 at the last; beyond 1 it descends — the sun sinking past the
 * dock's edge). `base` is the rail-level top in px.
 */
const sunArcTop = (t: number, base: number) => base - base * 0.32 * Math.sin(Math.PI * Math.min(1.25, Math.max(0, t)))

/** Rail-level top (px) for the sun, matching the CSS breakpoints (≤900px: 15px, else 17px). */
const sunBaseTop = () => (window.innerWidth <= 900 ? 15 : 17)

/**
 * "日晷坞" sundial dock: a frosted bottom bar (theme-tinted glass + 1px
 * hairline) that owns its layer — content pads clear of it instead of the
 * nav floating over content. Inside, a thin rail spans exactly from the first
 * to the last stop (hour rings), every moment's label stays visible (the
 * active one lights and grows), and the sun traveller rides the rail with the
 * scroll position, dropping a pulse trail before sinking past the dock's edge
 * at day's end (sunset).
 *
 * Geometry is measurement-driven: stop centres are read from the rendered
 * rings (relative to the dock inner), and the rail / sun / fill all derive
 * from those measured pixels — so the sun's centre and the fill's right edge
 * coincide with each stop's centre to sub-pixel precision at every viewport,
 * instead of assuming a percentage layout the flex markers do not follow.
 * Same mechanisms as the arc variant: scrollspy, deep-links, click jumps,
 * ArrowLeft/ArrowRight/Home/End.
 */
export function SundialDock() {
  const moments = siteConfig.moments
  const ids = moments.map((m) => m.id)
  const idsKey = ids.join(' ')
  const active = useScrollspy(ids)
  const nav = siteConfig.nav ?? {}
  const breathe = nav.breathe ?? true
  const keys = nav.keys ?? true
  const follow = nav.follow ?? true
  const sunset = nav.sunset ?? true
  const labels = nav.labels ?? true
  const tone = nav.dockTone ?? 'veil'
  const pulse = siteConfig.fx?.pulse !== false

  const n = moments.length
  const pad = 100 / (2 * n) // pre-measure estimate of the first stop centre (%)
  const activeIndex = Math.max(0, ids.indexOf(active ?? ids[0]))
  const theme = effectiveTheme(moments[activeIndex], siteConfig)

  const navRef = useRef<HTMLElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)
  const sunRef = useRef<HTMLSpanElement>(null)

  // Measured stop centres (px, relative to the dock inner's left edge).
  // null until the first layout measurement; re-measured on resize.
  const [stops, setStops] = useState<number[] | null>(null)
  const stopsRef = useRef<number[] | null>(null)
  useLayoutEffect(() => {
    const inner = innerRef.current
    if (!inner) return undefined
    const measure = () => {
      const innerLeft = inner.getBoundingClientRect().left
      const xs = [...inner.querySelectorAll('.timeline-nav__dot')].map((d) => {
        const r = d.getBoundingClientRect()
        return r.left + r.width / 2 - innerLeft
      })
      stopsRef.current = xs
      setStops((prev) => (prev && prev.length === xs.length && prev.every((v, i) => Math.abs(v - xs[i]) < 0.5) ? prev : xs))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [idsKey])

  // Continuous day-travel: the sun rides the rail with the scroll position,
  // interpolating between the measured stop centres (past the last stop it
  // continues to the dock's right edge, where the sunset sinks it).
  // Direct DOM writes — no re-render per frame.
  useEffect(() => {
    if (!follow && !sunset) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const nav = navRef.current
    const inner = innerRef.current
    const fill = fillRef.current
    const sun = sunRef.current
    const sections = idsKey.split(' ').map((id) => document.getElementById(id))
    const footer = document.querySelector<HTMLElement>('.site-footer')

    let raf = 0
    let lastPulse = 0
    let lastSunX = -1
    const update = () => {
      raf = 0
      const s = window.scrollY
      const vh = window.innerHeight
      const pts = stopsRef.current
      if (follow && inner && fill && sun && pts && pts.length >= 2) {
        const first = pts[0]
        const lastPt = pts[pts.length - 1]
        const span = Math.max(1, lastPt - first)
        const tops = sections.map((el) => (el ? el.getBoundingClientRect().top + s : 0))
        const last = tops.length - 1
        let i = 0
        for (let k = 0; k < tops.length; k++) if (s >= tops[k] - 1) i = k
        let sunX: number
        if (i < last) {
          const frac = clamp01((s - tops[i]) / Math.max(1, tops[i + 1] - tops[i]))
          sunX = pts[i] + frac * (pts[i + 1] - pts[i])
        } else {
          const end = Math.max(1, document.documentElement.scrollHeight - vh - tops[last])
          const frac = clamp01((s - tops[last]) / end)
          sunX = lastPt + frac * (inner.clientWidth - lastPt)
        }
        sun.style.left = `${sunX.toFixed(2)}px`
        sun.style.top = `${sunArcTop((sunX - first) / span, sunBaseTop()).toFixed(2)}px`
        // the fill never runs past the last stop: the sun may travel on to the
        // dock's edge for the sunset, but the day-line ends at the last hour
        fill.style.width = `${Math.max(0, Math.min(sunX, lastPt) - first).toFixed(2)}px`
        if (pulse) {
          const now = performance.now()
          // drop a mote every ~2.6% of the stop span (≈18px at desktop span)
          const step = Math.max(8, span * 0.026)
          if (lastSunX >= 0 && Math.abs(sunX - lastSunX) > step && now - lastPulse > 110) {
            lastPulse = now
            const mote = document.createElement('span')
            mote.className = 'timeline-nav__pulse sundial-dock__pulse'
            mote.style.left = `${sunX.toFixed(2)}px`
            inner.appendChild(mote)
            const pool = inner.querySelectorAll('.timeline-nav__pulse')
            if (pool.length > 12) pool[0].remove()
            window.setTimeout(() => mote.remove(), 1700)
          }
          lastSunX = sunX
        }
      }
      if (sunset && nav) {
        const footerTop = footer ? footer.getBoundingClientRect().top : vh
        nav.style.setProperty('--sunset', clamp01((vh - footerTop) / (vh * 0.55)).toFixed(3))
      }
    }
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) window.cancelAnimationFrame(raf)
      nav?.style.removeProperty('--sunset')
    }
  }, [idsKey, follow, sunset, pulse, stops])

  const jumpTo = (id: string) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
  }

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    jumpTo(id)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!keys || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    const anchor = (document.activeElement as HTMLElement | null)?.closest('a')
    if (!anchor || !navRef.current?.contains(anchor)) return
    const href = anchor.getAttribute('href') ?? ''
    const i = ids.indexOf(href.replace('#', ''))
    if (i < 0) return
    e.preventDefault()
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? ids.length - 1
          : Math.min(ids.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)))
    if (next === i) return
    const target = navRef.current.querySelector<HTMLAnchorElement>(`a[href="#${ids[next]}"]`)
    target?.focus()
    jumpTo(ids[next])
  }

  // Non-follow / reduced-motion: the sun rests exactly on the active stop
  // (CSS-transitioned). Until the first measurement lands, fall back to the
  // even-spacing estimate (identical to measured values once laid out).
  const estPct = (i: number) => pad + (i / (n - 1)) * (100 - 2 * pad)
  const restX = stops ? stops[activeIndex] : null
  const restTop = stops
    ? sunArcTop((stops[activeIndex] - stops[0]) / Math.max(1, stops[n - 1] - stops[0]), sunBaseTop())
    : sunArcTop(activeIndex / (n - 1), sunBaseTop())
  const spanPx = stops ? Math.max(1, stops[n - 1] - stops[0]) : null

  const navStyle = (
    tone === 'solid'
      ? ({ color: '#ece4d4', '--nav-veil': 'rgba(22, 27, 40, 0.92)' } as CSSProperties)
      : ({
          color: `var(--chrome-ink, ${theme.ink})`,
          '--nav-veil': `var(--chrome-veil-dock, ${withAlpha(theme.bg, 0.78)})`,
        } as CSSProperties)
  )

  const railStyle: CSSProperties = stops && spanPx !== null
    ? { left: `${stops[0].toFixed(2)}px`, width: `${spanPx.toFixed(2)}px` }
    : { left: `${pad}%`, right: `${pad}%` }
  const fillStyle: CSSProperties = stops
    ? { width: `${Math.max(0, Math.min(restX ?? 0, stops[n - 1]) - stops[0]).toFixed(2)}px` }
    : { width: `${(estPct(activeIndex) - pad).toFixed(2)}%` }
  const sunStyle: CSSProperties = stops
    ? { left: `${(restX ?? 0).toFixed(2)}px`, top: `${restTop.toFixed(2)}px` }
    : { left: `${estPct(activeIndex).toFixed(2)}%`, top: `${restTop.toFixed(2)}px` }

  return (
    <nav
      ref={navRef}
      className={`timeline-nav sundial-dock${breathe ? ' timeline-nav--breathe' : ''}${tone === 'solid' ? ' sundial-dock--solid' : ''}${labels ? '' : ' sundial-dock--sparse'}`}
      aria-label={siteConfig.copy.navAria}
      style={navStyle}
      onKeyDown={onKeyDown}
    >
      <div className="sundial-dock__inner" ref={innerRef}>
        <ol className="timeline-nav__markers">
          {moments.map((m) => {
            const isActive = active === m.id
            return (
              <li key={m.id}>
                <a href={`#${m.id}`} onClick={jump(m.id)} className={isActive ? 'is-active' : undefined} aria-current={isActive ? 'true' : undefined}>
                  <span className="timeline-nav__dot" aria-hidden="true" />
                  <span className="timeline-nav__label">
                    <span className="timeline-nav__name">{m.label}</span>
                  </span>
                  <span className="sundial-dock__short" aria-hidden="true">
                    {m.label.charAt(0)}
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
        <span className="sundial-dock__rail" style={railStyle} aria-hidden="true">
          <span className="timeline-nav__track sundial-dock__track" />
          <span className="timeline-nav__progress sundial-dock__fill" ref={fillRef} style={fillStyle} />
        </span>
        <span className="timeline-nav__sun sundial-dock__sun" ref={sunRef} style={sunStyle} aria-hidden="true" />
      </div>
    </nav>
  )
}
