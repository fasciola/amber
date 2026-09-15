import { useEffect, useRef, type RefObject } from 'react'
import { siteConfig } from '../config'

/**
 * Magnetic hover (`fx.magnet`, default on): the element follows the cursor by
 * up to `strength` px and springs back on leave. Desktop pointers only;
 * touch and reduced-motion keep the element perfectly still.
 */
export function useMagnetic<T extends HTMLElement>(strength = 4): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (siteConfig.fx?.magnet === false) return undefined
    const el = ref.current
    if (!el) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    if (window.matchMedia('(hover: none)').matches) return undefined

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = Math.max(-strength, Math.min(strength, ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength))
      const dy = Math.max(-strength, Math.min(strength, ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength))
      el.style.transition = 'none'
      el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`
    }
    const leave = () => {
      el.style.transition = 'transform 0.55s cubic-bezier(0.34, 1.35, 0.64, 1)'
      el.style.transform = ''
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.style.transition = ''
      el.style.transform = ''
    }
  }, [strength])

  return ref
}
