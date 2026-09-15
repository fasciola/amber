import { useEffect, useRef, type RefObject } from 'react'

/**
 * Subtle scroll parallax: translates the target element vertically relative
 * to its section's viewport position. `speed` is kept small on purpose
 * (≈0.01–0.02 → ±8–16px of drift through a section). `ease` < 1 adds
 * per-layer lag (the layer settles behind the scroll, collage fragments each
 * get their own inertia). Disabled for reduced motion; cleans up its
 * rAF/scroll listener on unmount.
 */
export function useParallax<T extends HTMLElement>(
  sectionRef: RefObject<HTMLElement | null>,
  speed = 0.12,
  ease = 1,
): RefObject<T | null> {
  const layerRef = useRef<T | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    const layer = layerRef.current
    if (!section || !layer || speed === 0) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let raf = 0
    let current = 0
    const targetFor = () => {
      const rect = section.getBoundingClientRect()
      const centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2
      return -centerOffset * speed
    }
    const apply = (v: number) => {
      layer.style.transform = `translateY(${v.toFixed(1)}px)`
    }
    const tick = () => {
      const target = targetFor()
      const next = current + (target - current) * ease
      current = Math.abs(target - next) < 0.05 ? target : next
      apply(current)
      raf = current === target ? 0 : window.requestAnimationFrame(tick)
    }
    const schedule = () => {
      if (ease >= 1) {
        if (raf) return
        raf = window.requestAnimationFrame(() => {
          raf = 0
          current = targetFor()
          apply(current)
        })
      } else if (!raf) {
        raf = window.requestAnimationFrame(tick)
      }
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) window.cancelAnimationFrame(raf)
      layer.style.transform = ''
    }
  }, [sectionRef, speed, ease])

  return layerRef
}
