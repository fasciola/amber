import { useEffect } from 'react'
import { siteConfig } from './config'
import { validateConfig } from './lib/validateConfig'
import { MomentSection } from './components/MomentSection'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { TimelineNav } from './components/TimelineNav'
import { CursorGlow } from './components/CursorGlow'
import { SocialEdge } from './components/SocialEdge'
import { useScrollReveal } from './hooks/useScrollReveal'
import { useChromeLink } from './hooks/useChromeLink'

function ConfigError() {
  const issues = validateConfig(siteConfig)
  if (issues.length === 0) return null
  return (
    <main className="config-error" role="alert">
      <h1>Configuration error</h1>
      <ul>
        {issues.map((issue, i) => (
          <li key={i}>
            <code>{issue.path}</code> — {issue.message}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default function App() {
  useScrollReveal()
  useChromeLink()

  // Quiet-luxury motion layer: expose per-effect switches as root classes so
  // CSS-gated effects (title develop, frag drift) can key off them.
  useEffect(() => {
    const fx = siteConfig.fx ?? {}
    const root = document.documentElement
    const keys = ['dust', 'magnet', 'develop', 'pulse', 'drift', 'glow'] as const
    keys.forEach((k) => {
      if (fx[k] !== false) root.classList.add(`fx-${k}`)
    })
    return () => keys.forEach((k) => root.classList.remove(`fx-${k}`))
  }, [])

  // Nav variant drives the bottom-chrome clearance budget (--arc-clear).
  useEffect(() => {
    const variant = siteConfig.nav?.variant ?? 'dock'
    document.documentElement.dataset.navVariant = variant
    return () => {
      delete document.documentElement.dataset.navVariant
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = siteConfig.locale
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) description.content = siteConfig.siteDescription
    document.title = siteConfig.siteTitle
  }, [])

  // Deep links (#<moment-id>) land on their section even though the SPA
  // renders after the browser's native anchor attempt has already run.
  useEffect(() => {
    const id = window.location.hash.replace('#', '')
    if (!id || !siteConfig.moments.some((m) => m.id === id)) return undefined
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [])

  if (validateConfig(siteConfig).length > 0) return <ConfigError />

  // The newsletter lives inside the nightfall moment when one exists;
  // otherwise the footer hosts it so the #newsletter anchor always resolves.
  const hasNightfall = siteConfig.moments.some((m) => m.layout === 'nightfall')
  const placement = siteConfig.socialPlacement ?? 'edge'
  // Previous section's outgoing color, mirroring SectionShell's blendTo rule —
  // feeds the top blend zone that melts one moment into the next.
  const outgoingOf = (i: number) => {
    const m = siteConfig.moments[i]
    return m.theme.bgTo ?? siteConfig.moments[i + 1]?.theme.bg
  }

  return (
    <>
      <a className="skip-link" href="#newsletter">
        {siteConfig.copy.skipLink}
      </a>
      <SiteHeader />
      <TimelineNav />
      {placement === 'edge' ? <SocialEdge /> : null}
      <CursorGlow />
      <main id="top">
        {siteConfig.moments.map((moment, i) => (
          <MomentSection
            key={moment.id}
            moment={moment}
            nextTheme={siteConfig.moments[i + 1]?.theme}
            prevBlend={i > 0 ? outgoingOf(i - 1) : undefined}
          />
        ))}
      </main>
      <SiteFooter withNewsletter={!hasNightfall} />
    </>
  )
}
