import { useEffect } from 'react'
import { siteConfig } from '../config'
import { hexToRgb, mixHex, withAlpha } from '../lib/color'
import { effectiveTheme } from '../lib/theme'

/**
 * Scroll-linked chrome interpolation (`blend.link`, default on): the fixed
 * chrome (header + arc nav) carries `--chrome-ink` / `--chrome-veil-*` CSS
 * vars that follow the scroll position continuously between neighbouring
 * moment themes (effective display themes — the dawn 'first-light' mood
 * included), instead of stepping when the scrollspy flips. Direct DOM writes
 * (rAF-throttled), no re-renders. Reduced motion keeps the static per-moment
 * colors (React inline fallbacks win because the vars stay unset).
 */
export function useChromeLink() {
  useEffect(() => {
    if (siteConfig.blend?.link === false) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const moments = siteConfig.moments
    const themes = moments.map((m) => effectiveTheme(m, siteConfig))
    const sections = moments.map((m) => document.getElementById(m.id))
    if (sections.some((el) => !el)) return undefined
    const root = document.documentElement

    let raf = 0
    const update = () => {
      raf = 0
      const s = window.scrollY + window.innerHeight / 2
      const doc = window.scrollY
      const centers = sections.map((el) => {
        const rect = el!.getBoundingClientRect()
        return rect.top + doc + rect.height / 2
      })
      const last = centers.length - 1
      let ink = themes[0].ink
      let bg = themes[0].bg
      if (s >= centers[last]) {
        ink = themes[last].ink
        bg = themes[last].bg
      } else {
        let i = 0
        for (let k = 0; k < last; k++) if (s >= centers[k]) i = k
        const t = Math.min(1, Math.max(0, (s - centers[i]) / Math.max(1, centers[i + 1] - centers[i])))
        ink = mixHex(themes[i].ink, themes[i + 1].ink, t)
        bg = mixHex(themes[i].bg, themes[i + 1].bg, t)
      }
      root.style.setProperty('--chrome-ink', ink)
      root.style.setProperty('--chrome-veil-header', withAlpha(bg, 0.66))
      root.style.setProperty('--chrome-veil-nav', withAlpha(bg, 0.62))
      root.style.setProperty('--chrome-veil-dock', withAlpha(bg, 0.78))
      const I = hexToRgb(ink)
      root.style.setProperty('--glow-rgb', `${I.r}, ${I.g}, ${I.b}`)
    }
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update)
    }
    update()
    root.classList.add('chrome-linked')
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) window.cancelAnimationFrame(raf)
      root.classList.remove('chrome-linked')
      root.style.removeProperty('--chrome-ink')
      root.style.removeProperty('--chrome-veil-header')
      root.style.removeProperty('--chrome-veil-nav')
      root.style.removeProperty('--chrome-veil-dock')
      root.style.removeProperty('--glow-rgb')
    }
  }, [])
}
