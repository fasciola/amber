import { siteConfig } from '../config'
import { SocialRow } from './SocialEntry'
import { NewsletterForm } from './NewsletterForm'

/**
 * Slim closing bar: tagline, socials, small links, copyright.
 * When no moment uses the nightfall layout, the newsletter form falls back
 * to living here (classic footer mode) so `#newsletter` always resolves.
 * A top blend zone melts the last moment's outgoing color into the footer
 * chrome so the day closes without a seam.
 */
export function SiteFooter({ withNewsletter }: { withNewsletter: boolean }) {
  const copy = siteConfig.copy
  const moments = siteConfig.moments
  const last = moments[moments.length - 1]
  const lastBlend = last.theme.bgTo ?? last.theme.bg
  const zoneVh = siteConfig.blend?.zoneVh ?? 26
  return (
    <footer className={`site-footer${withNewsletter ? ' site-footer--with-newsletter' : ''}`}>
      {zoneVh > 0 ? (
        <span
          className="site-footer__blend"
          aria-hidden="true"
          style={{ backgroundImage: `linear-gradient(180deg, ${lastBlend} 0%, transparent 100%)`, height: `${zoneVh}vh` }}
        />
      ) : null}
      <div className="site-footer__inner" data-reveal>
        {withNewsletter ? <NewsletterForm /> : null}
        <p className="site-footer__tagline">{copy.footer.tagline}</p>
        <SocialRow className="site-footer__social" />
        <div className="site-footer__bottom">
          <nav aria-label="Footer">
            {copy.footer.smallLinks.map((l) => (
              <a key={l.label} href={l.href} className="footer-link">
                {l.label}
              </a>
            ))}
          </nav>
          <p>{copy.footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
