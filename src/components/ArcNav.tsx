import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { siteConfig } from '../config'
import { useScrollspy } from '../hooks/useScrollspy'
import { withAlpha } from '../lib/color'
import { effectiveTheme } from '../lib/theme'

interface ArcPoint {
  x: number
  y: number
  len: number
}

interface ArcGeom {
  w: number
  h: number
  d: string
  total: number
  points: ArcPoint[]
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Bottom arc progress river: a thin arc spans the viewport bottom (the sun's
 * path — the day-arc narrative made navigation). Moment markers ride the arc;
 * the active one glows/breathes and reveals its label;
 * a progress stroke and a small sun traveller follow the scroll position
 * through the day; hovering/focusing a marker raises a frosted name card;
 * ArrowLeft/ArrowRight move between moments; and when the footer scrolls in,
 * the last marker sinks and the arc light fades (sunset). Same mechanisms as
 * a classic scrollspy timeline: IntersectionObserver tracking, anchor
 * deep-links, click/keyboard jumps. Colors follow the active moment's theme.
 */
export function ArcNav() {
  const moments = siteConfig.moments
  const ids = moments.map((m) => m.id)
  const idsKey = ids.join(' ')
  const active = useScrollspy(ids)
  const arcRiseVw = siteConfig.nav?.arcRiseVw ?? 8
  const breathe = siteConfig.nav?.breathe ?? true
  const keys = siteConfig.nav?.keys ?? true
  const follow = siteConfig.nav?.follow ?? true
  const sunset = siteConfig.nav?.sunset ?? true
  const navRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const progressRef = useRef<SVGPathElement>(null)
  const sunRef = useRef<SVGCircleElement>(null)
  const probeRef = useRef<SVGPathElement | null>(null)
  const [geom, setGeom] = useState<ArcGeom | null>(null)

  // Measure the real viewport box and lay the arc + markers out in pixel units.
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const count = idsKey.split(' ').length
    const compute = () => {
      const rect = svg.getBoundingClientRect()
      const w = Math.round(rect.width)
      const h = Math.round(rect.height)
      if (w < 40 || h < 24) return
      const padX = Math.max(28, Math.min(w * 0.07, 96))
      const baseY = h - 14
      const rise = Math.max(10, Math.min(h - 30, (arcRiseVw / 100) * w))
      const d = `M ${padX} ${baseY} Q ${w / 2} ${baseY - 2 * rise} ${w - padX} ${baseY}`
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      probe.setAttribute('d', d)
      probeRef.current = probe
      const total = probe.getTotalLength()
      const points: ArcPoint[] = Array.from({ length: count }, (_, i) => {
        const t = count === 1 ? 0.5 : i / (count - 1)
        const len = total * t
        const p = probe.getPointAtLength(len)
        return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, len }
      })
      setGeom({ w, h, d, total, points })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [idsKey, arcRiseVw])

  const activeIndex = Math.max(0, ids.indexOf(active ?? ids[0]))
  const activeTheme = effectiveTheme(moments[activeIndex], siteConfig)
  const activeLen = geom?.points[activeIndex]?.len ?? 0

  // Continuous day-travel: the progress stroke + sun follow the scroll
  // position through the sections, the sun drops a fading pulse trail
  // (`fx.pulse`), and the sunset dims the arc as the footer arrives.
  // Direct DOM writes (rAF-throttled) — no re-render per frame.
  // Reduced motion keeps per-moment instant jumps and a static arc.
  useEffect(() => {
    if (!geom || (!follow && !sunset)) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const nav = navRef.current
    const progress = progressRef.current
    const sun = sunRef.current
    const probe = probeRef.current
    const svg = svgRef.current
    const pulse = siteConfig.fx?.pulse !== false
    const sections = idsKey.split(' ').map((id) => document.getElementById(id))
    const footer = document.querySelector<HTMLElement>('.site-footer')

    let raf = 0
    let lastPulse = 0
    let lastPx = -1
    let lastPy = -1
    const update = () => {
      raf = 0
      const s = window.scrollY
      const vh = window.innerHeight
      if (follow && progress && probe) {
        const tops = sections.map((el) => (el ? el.getBoundingClientRect().top + s : 0))
        let i = 0
        for (let k = 0; k < tops.length; k++) if (s >= tops[k] - 1) i = k
        const last = tops.length - 1
        let len: number
        if (i < last) {
          const frac = clamp01((s - tops[i]) / Math.max(1, tops[i + 1] - tops[i]))
          len = geom.points[i].len + frac * (geom.points[i + 1].len - geom.points[i].len)
        } else {
          const end = Math.max(1, document.documentElement.scrollHeight - vh - tops[last])
          const frac = clamp01((s - tops[last]) / end)
          len = geom.points[last].len + frac * (geom.total - geom.points[last].len)
        }
        progress.style.strokeDashoffset = String(geom.total - len)
        if (sun) {
          const p = probe.getPointAtLength(len)
          sun.setAttribute('cx', String(Math.round(p.x * 10) / 10))
          sun.setAttribute('cy', String(Math.round(p.y * 10) / 10))
          // pulse trail: a fading mote every ~26px of travel along the arc
          if (pulse && svg) {
            const now = performance.now()
            if (lastPx >= 0 && Math.hypot(p.x - lastPx, p.y - lastPy) > 26 && now - lastPulse > 110) {
              lastPulse = now
              const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
              c.setAttribute('class', 'timeline-nav__pulse')
              c.setAttribute('cx', String(Math.round(p.x * 10) / 10))
              c.setAttribute('cy', String(Math.round(p.y * 10) / 10))
              c.setAttribute('r', '3')
              svg.appendChild(c)
              const pool = svg.querySelectorAll('.timeline-nav__pulse')
              if (pool.length > 14) pool[0].remove()
              window.setTimeout(() => c.remove(), 1800)
            }
            lastPx = p.x
            lastPy = p.y
          }
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
  }, [geom, idsKey, follow, sunset])

  const jumpTo = (id: string) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
  }

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    jumpTo(id)
  }

  // ArrowLeft/ArrowRight walk the markers: move focus and travel together.
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!keys || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    const anchor = (document.activeElement as HTMLElement | null)?.closest('a')
    if (!anchor || !navRef.current?.contains(anchor)) return
    const href = anchor.getAttribute('href') ?? ''
    const i = ids.indexOf(href.replace('#', ''))
    if (i < 0) return
    e.preventDefault()
    const next = Math.min(ids.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)))
    if (next === i) return
    const target = navRef.current.querySelector<HTMLAnchorElement>(`a[href="#${ids[next]}"]`)
    target?.focus()
    jumpTo(ids[next])
  }

  const navStyle = {
    color: `var(--chrome-ink, ${activeTheme.ink})`,
    '--nav-veil': `var(--chrome-veil-nav, ${withAlpha(activeTheme.bg, 0.62)})`,
  } as CSSProperties

  const sunHome = geom?.points[activeIndex]

  return (
    <nav
      ref={navRef}
      className={`timeline-nav timeline-nav--arc${breathe ? ' timeline-nav--breathe' : ''}`}
      aria-label={siteConfig.copy.navAria}
      style={navStyle}
      onKeyDown={onKeyDown}
    >
      <svg ref={svgRef} className="timeline-nav__svg" viewBox={geom ? `0 0 ${geom.w} ${geom.h}` : undefined} aria-hidden="true">
        {geom ? (
          <>
            <path className="timeline-nav__track" d={geom.d} fill="none" />
            <path
              ref={progressRef}
              className="timeline-nav__progress"
              d={geom.d}
              fill="none"
              pathLength={geom.total}
              strokeDasharray={geom.total}
              strokeDashoffset={geom.total - activeLen}
            />
            <circle
              ref={sunRef}
              className="timeline-nav__sun"
              r="4.5"
              cx={sunHome?.x ?? 0}
              cy={sunHome?.y ?? 0}
            />
          </>
        ) : null}
      </svg>
      <ol className="timeline-nav__markers">
        {geom
          ? moments.map((m, i) => {
              const pt = geom.points[i]
              const isActive = active === m.id
              return (
                <li key={m.id} style={{ left: pt.x, top: pt.y }}>
                  <a
                    href={`#${m.id}`}
                    onClick={jump(m.id)}
                    className={isActive ? 'is-active' : undefined}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="timeline-nav__dot" aria-hidden="true" />
                    <span className="timeline-nav__label">
                      <span className="timeline-nav__name">{m.label}</span>
                    </span>
                  </a>
                </li>
              )
            })
          : null}
      </ol>
    </nav>
  )
}
