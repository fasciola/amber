import { useEffect } from 'react'

const REVEAL_CLASS = 'reveal'
const INVIEW_CLASS = 'is-inview'

/** One-shot scroll-reveal for [data-reveal] elements; reduced-motion shows all. */
export function useScrollReveal() {
  useEffect(() => {
    const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
    if (targets.length === 0) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver !== 'function') {
      targets.forEach((el) => el.classList.add(INVIEW_CLASS))
      return undefined
    }

    targets.forEach((el) => el.classList.add(REVEAL_CLASS))
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(INVIEW_CLASS)
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    )
    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}
