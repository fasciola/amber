import { useEffect, useRef } from 'react'
import { siteConfig } from '../config'

/**
 * Cursor glow (`fx.glow`, default on): a large soft halo drifts after the
 * cursor with heavy lag, tinted by the current theme (soft-light blend keeps
 * it quiet on paper and luminous at dusk). Desktop pointers only; touch and
 * reduced-motion never show it.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (siteConfig.fx?.glow === false) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return undefined
    const el = ref.current
    if (!el) return undefined

    let raf = 0
    let tx = window.innerWidth / 2
    let ty = window.innerHeight * 0.4
    let x = tx
    let y = ty
    const half = 320
    const tick = () => {
      x += (tx - x) * 0.055
      y += (ty - y) * 0.055
      el.style.transform = `translate3d(${(x - half).toFixed(1)}px, ${(y - half).toFixed(1)}px, 0)`
      raf = Math.hypot(tx - x, ty - y) > 0.3 ? window.requestAnimationFrame(tick) : 0
    }
    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (el.style.opacity !== '1') el.style.opacity = '1'
      if (!raf) raf = window.requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  if (siteConfig.fx?.glow === false) return null
  return <div ref={ref} className="cursor-glow" aria-hidden="true" />
}
