import { siteConfig } from '../config'
import { ArcNav } from './ArcNav'
import { SundialDock } from './SundialDock'

/**
 * Bottom navigation dispatcher: `nav.variant: 'dock'` (default) renders the
 * "日晷坞" sundial dock; 'arc' keeps a thin arc progress river.
 * Both carry the same scrollspy / deep-link / click / keyboard contracts.
 */
export function TimelineNav() {
  const variant = siteConfig.nav?.variant ?? 'dock'
  return variant === 'arc' ? <ArcNav /> : <SundialDock />
}
