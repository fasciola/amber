import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { siteConfig } from '../config'
import { hexToRgb } from '../lib/color'
import type { MomentParticles, MomentTheme, ParticleKind } from '../types'

interface Mote {
  x: number // base position, fraction of width
  y: number // base position, fraction of height
  r: number // radius px
  vx: number // px/s
  vy: number // px/s
  a: number // base alpha
  phase: number
  tw: number // twinkle/breath frequency (rad/s)
  sway: number // sway amplitude px (breeze kinds)
  swayF: number // sway frequency (rad/s)
  path: number // 0 = plain mote; >0 = secondary path radius (firefly wander)
}

/** Deterministic pseudo-random (seeded per index) so every reload composes the same quiet sky. */
const rand = (seed: number) => {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const TAU = Math.PI * 2
const FIREFLY = { r: 232, g: 212, b: 138 } // dusk firefly gold (engine constant)
const SEEDS: Record<ParticleKind, number> = { dust: 97, mist: 41, pollen: 53, heat: 67, ember: 83, night: 29 }

/** Per-family mote factory: count, kinematics, and alphas all speak the hour's language. */
function spawn(kind: ParticleKind, density: number, speed: number): Mote[] {
  const rng = rand(SEEDS[kind])
  const mote = (over: Partial<Mote>): Mote => ({
    x: rng(),
    y: rng(),
    r: 1,
    vx: 0,
    vy: 0,
    a: 0.2,
    phase: rng() * TAU,
    tw: 0.5,
    sway: 0,
    swayF: 0,
    path: 0,
    ...over,
  })
  const n = (base: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(base * density)))
  switch (kind) {
    case 'mist':
      // morning-mist light dust: large soft haze blobs, slow rise, gentle sway
      return Array.from({ length: n(18, 8, 36) }, () =>
        mote({
          r: 11 + rng() * 25,
          vx: (rng() - 0.5) * 3 * speed,
          vy: -(2.5 + rng() * 4) * speed,
          a: 0.08 + rng() * 0.09,
          tw: (0.5 + rng() * 0.8) * speed,
          sway: 10 + rng() * 14,
          swayF: (0.3 + rng() * 0.4) * speed,
        }),
      )
    case 'pollen':
      // pollen / dandelion down: light tufts carried on a breeze
      return Array.from({ length: n(24, 10, 48) }, (_, i) =>
        mote({
          r: i % 5 === 0 ? 2.6 + rng() * 1.2 : 0.8 + rng() * 1.3,
          vx: (2.5 + rng() * 5.5) * speed,
          vy: (rng() - 0.5) * 2.6 * speed,
          a: 0.22 + rng() * 0.3,
          tw: (0.4 + rng() * 0.6) * speed,
          sway: 13 + rng() * 18,
          swayF: (1.6 + rng() * 1.8) * speed,
          path: i % 5 === 0 ? 1 : 0, // every fifth is a spinning tuft
        }),
      )
    case 'heat':
      // midday heat shimmer: fine bright glints, fast twinkle, rising straight
      return Array.from({ length: n(30, 12, 60) }, () =>
        mote({
          r: 0.6 + rng() * 1.1,
          vy: -(5 + rng() * 9) * speed,
          a: 0.3 + rng() * 0.42,
          tw: (7 + rng() * 9) * speed,
          sway: 1.4 + rng() * 2.2,
          swayF: (5 + rng() * 5) * speed,
        }),
      )
    case 'ember':
      // golden-hour glow motes: big warm soft orbs, ultra-slow drift and breath
      return Array.from({ length: n(11, 5, 22) }, () =>
        mote({
          r: 12 + rng() * 20,
          vx: (rng() - 0.5) * 4 * speed,
          vy: -(1 + rng() * 2.6) * speed,
          a: 0.09 + rng() * 0.11,
          tw: (0.7 + rng() * 1.1) * speed,
          sway: 8 + rng() * 12,
          swayF: (0.2 + rng() * 0.3) * speed,
        }),
      )
    case 'night': {
      // dusk: breathing star field + a few fireflies wandering lit trails
      const stars = Array.from({ length: n(44, 18, 88) }, () =>
        mote({
          r: 0.5 + rng() * 0.9,
          a: 0.25 + rng() * 0.5,
          tw: (1.2 + rng() * 2.6) * speed,
        }),
      )
      const flies = Array.from({ length: n(5, 3, 8) }, () =>
        mote({
          x: 0.15 + rng() * 0.7,
          y: 0.2 + rng() * 0.6,
          r: 1.7 + rng() * 0.9,
          a: 0.55 + rng() * 0.3,
          tw: (1.6 + rng() * 1.6) * speed, // blink clock
          sway: 30 + rng() * 46,
          swayF: (0.35 + rng() * 0.4) * speed,
          path: 16 + rng() * 26, // secondary wander radius
        }),
      )
      return [...stars, ...flies]
    }
    default:
      // generic quiet motes
      return Array.from({ length: n(26, 10, 52) }, () =>
        mote({
          r: 0.7 + rng() * 1.6,
          vx: (1.5 + rng() * 5) * speed,
          vy: -(1 + rng() * 3.2) * speed,
          a: 0.08 + rng() * 0.14,
          tw: (1.6 + rng() * 3.2) * speed,
        }),
      )
  }
}

/** Firefly wander position at time t (analytic, so trails and the static RM frame agree). */
const flyPos = (p: Mote, w: number, h: number, t: number) => ({
  x: p.x * w + Math.sin(t * p.swayF + p.phase) * p.sway + Math.sin(t * p.swayF * 0.53 + p.phase * 1.7) * p.path,
  y: p.y * h + Math.cos(t * p.swayF * 0.81 + p.phase) * p.sway * 0.62 + Math.cos(t * p.swayF * 0.37 + p.phase * 2.3) * p.path * 0.6,
})

interface Rgb {
  r: number
  g: number
  b: number
}

/** Per-family painter: draws one frame at time t (seconds). */
function paint(kind: ParticleKind, ctx: CanvasRenderingContext2D, motes: Mote[], w: number, h: number, t: number, tint: Rgb) {
  ctx.clearRect(0, 0, w, h)
  const wrap = (v: number, span: number, m: number) => (((v % (span + 2 * m)) + span + 2 * m) % (span + 2 * m)) - m
  const softDisc = (x: number, y: number, r: number, c: Rgb, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha.toFixed(3)})`)
    g.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fill()
  }
  const dot = (x: number, y: number, r: number, c: Rgb, alpha: number) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.min(1, alpha).toFixed(3)})`
    ctx.fill()
  }

  for (const p of motes) {
    if (kind === 'mist') {
      const x = wrap(p.x * w + p.vx * t + Math.sin(t * p.swayF + p.phase) * p.sway, w, 64)
      const y = wrap(p.y * h + p.vy * t, h, 64)
      const breathe = 0.6 + 0.4 * Math.sin(t * p.tw + p.phase)
      softDisc(x, y, p.r, tint, p.a * breathe * 1.5)
      dot(x, y, Math.max(0.7, p.r * 0.07), tint, p.a * breathe * 3)
    } else if (kind === 'pollen') {
      const x = wrap(p.x * w + p.vx * t + Math.sin(t * p.swayF + p.phase) * p.sway, w, 24)
      const y = wrap(p.y * h + p.vy * t + Math.cos(t * p.swayF * 0.7 + p.phase) * p.sway * 0.4, h, 24)
      const alpha = p.a * (0.65 + 0.35 * Math.sin(t * p.tw + p.phase))
      if (p.path > 0) {
        // dandelion tuft: a tiny spinning cross of down
        const rot = t * 0.5 + p.phase
        ctx.strokeStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${(alpha * 0.85).toFixed(3)})`
        ctx.lineWidth = 0.7
        for (let k = 0; k < 3; k++) {
          const ang = rot + (k * Math.PI) / 3
          ctx.beginPath()
          ctx.moveTo(x - Math.cos(ang) * p.r, y - Math.sin(ang) * p.r)
          ctx.lineTo(x + Math.cos(ang) * p.r, y + Math.sin(ang) * p.r)
          ctx.stroke()
        }
        dot(x, y, 0.8, tint, alpha)
      } else {
        dot(x, y, p.r, tint, alpha)
      }
    } else if (kind === 'heat') {
      const x = wrap(p.x * w + Math.sin(t * p.swayF + p.phase) * p.sway, w, 16)
      const y = wrap(p.y * h + p.vy * t, h, 16)
      const glint = Math.pow(0.5 + 0.5 * Math.sin(t * p.tw + p.phase), 2)
      dot(x, y, p.r, tint, p.a * glint)
    } else if (kind === 'ember') {
      const x = wrap(p.x * w + p.vx * t + Math.sin(t * p.swayF + p.phase) * p.sway, w, 64)
      const y = wrap(p.y * h + p.vy * t, h, 64)
      const breathe = 0.55 + 0.45 * Math.sin(t * p.tw + p.phase)
      softDisc(x, y, p.r, tint, p.a * breathe * 1.9)
      dot(x, y, Math.max(0.8, p.r * 0.09), tint, p.a * breathe * 3.2)
    } else if (kind === 'night') {
      if (p.path > 0) {
        // firefly: blink with a sharp falloff, wander an analytic path, leave a fading trail
        const blink = Math.pow(Math.max(0, Math.sin(t * p.tw + p.phase)), 3)
        const here = flyPos(p, w, h, t)
        for (let k = 8; k >= 1; k--) {
          const back = flyPos(p, w, h, t - k * 0.14)
          dot(back.x, back.y, p.r * (0.5 - k * 0.04), FIREFLY, p.a * blink * (0.09 - k * 0.01))
        }
        softDisc(here.x, here.y, p.r * 4.2, FIREFLY, p.a * blink * 0.5)
        dot(here.x, here.y, p.r, FIREFLY, p.a * blink)
      } else {
        // star: fixed in the sky, breathing slowly
        const alpha = p.a * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * p.tw + p.phase)))
        dot(p.x * w, p.y * h, p.r, tint, alpha)
      }
    } else {
      // generic quiet motes
      const x = wrap(p.x * w + p.vx * t, w, 12)
      const y = wrap(p.y * h + p.vy * t, h, 12)
      const alpha = p.a * (0.55 + 0.45 * Math.sin(t * p.tw + p.phase))
      dot(x, y, p.r, tint, alpha)
    }
  }
}

interface DustFieldProps {
  theme: MomentTheme
  particles?: MomentParticles
  sectionRef: RefObject<HTMLElement | null>
  /** Fade the field out across the top/bottom blend zone so neighbouring
   *  families cross-fade inside the seam instead of hard-cutting at it. */
  fadeTop?: boolean
  fadeBottom?: boolean
}

/**
 * "时尘" hour particles (`fx.dust`, default on): each moment renders its own
 * configured particle family (`moment.particles.kind` — mist / pollen / heat /
 * ember / night, generic 'dust' when unset), tinted with `particles.tint` or
 * the theme ink, scaled by `density`/`speed`. One canvas per section, animated
 * only while the section is in view (IntersectionObserver); inside the section
 * blend zones the canvas fades out so neighbouring families melt into each
 * other. Reduced motion renders a single static frame and never starts the loop.
 */
export function DustField({ theme, particles, sectionRef, fadeTop = false, fadeBottom = false }: DustFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const kind = particles?.kind ?? 'dust'
  const density = particles?.density ?? 1
  const speed = particles?.speed ?? 1
  const tintHex = particles?.tint ?? theme.ink

  useEffect(() => {
    if (siteConfig.fx?.dust === false) return undefined
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const tint = hexToRgb(tintHex)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const motes = spawn(kind, density, speed)

    let w = 0
    let h = 0
    const resize = () => {
      const rect = section.getBoundingClientRect()
      w = Math.max(1, Math.round(rect.width))
      h = Math.max(1, Math.round(rect.height))
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const draw = (t: number) => paint(kind, ctx, motes, w, h, t, tint)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(7.3)
      window.addEventListener('resize', resize)
      return () => window.removeEventListener('resize', resize)
    }

    let raf = 0
    let running = false
    const t0 = performance.now()
    const loop = (now: number) => {
      draw((now - t0) / 1000)
      raf = running ? window.requestAnimationFrame(loop) : 0
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting
        canvas.dataset.running = running ? '1' : '0'
        if (running && !raf) raf = window.requestAnimationFrame(loop)
      },
      { threshold: 0.04 },
    )
    io.observe(section)
    window.addEventListener('resize', resize)
    return () => {
      io.disconnect()
      window.removeEventListener('resize', resize)
      if (raf) window.cancelAnimationFrame(raf)
      delete canvas.dataset.running
    }
  }, [kind, density, speed, tintHex, theme.ink, sectionRef])

  if (siteConfig.fx?.dust === false) return null

  // Cross-fade across the blend zones: the field dissolves before the seam, so
  // the incoming moment's family always arrives through a fade, never a cut.
  const zoneVh = siteConfig.blend?.zoneVh ?? 26
  let maskImage: string | undefined
  if (fadeTop && fadeBottom && zoneVh > 0) {
    maskImage = `linear-gradient(180deg, transparent 0px, #000 ${zoneVh}vh, #000 calc(100% - ${zoneVh}vh), transparent 100%)`
  } else if (fadeTop && zoneVh > 0) {
    maskImage = `linear-gradient(180deg, transparent 0px, #000 ${zoneVh}vh)`
  } else if (fadeBottom && zoneVh > 0) {
    maskImage = `linear-gradient(0deg, transparent 0px, #000 ${zoneVh}vh)`
  }
  const style = maskImage ? ({ maskImage, WebkitMaskImage: maskImage } as CSSProperties) : undefined

  return <canvas ref={canvasRef} className="dust-canvas" data-kind={kind} style={style} aria-hidden="true" />
}
