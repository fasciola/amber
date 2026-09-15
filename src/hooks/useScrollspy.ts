import { useEffect, useState } from 'react'

/** Tracks which moment section is currently centered in the viewport. */
export function useScrollspy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null)
  const idsKey = ids.join(' ')

  useEffect(() => {
    const idList = idsKey.split(' ')
    if (idList.length === 0 || typeof IntersectionObserver !== 'function') return undefined
    const visibility = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
        let best: string | null = null
        let bestRatio = 0
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = id
          }
        }
        if (best && bestRatio > 0) setActive(best)
      },
      { rootMargin: '-38% 0px -38% 0px', threshold: [0, 0.1, 0.25, 0.5] },
    )
    idList.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [idsKey])

  return active
}
