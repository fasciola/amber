import { useState, type CSSProperties } from 'react'
import { siteConfig } from '../config'
import { useMagnetic } from '../hooks/useMagnetic'
import { trpc } from '@/providers/trpc'
import type { MomentTheme } from '../types'

/**
 * Newsletter signup — persists the address via the newsletter.subscribe tRPC
 * mutation. Rendered inside the nightfall moment when one exists, otherwise
 * inside the footer. Colors follow the hosting theme via --nl-* CSS variables.
 */
export function NewsletterForm({ theme }: { theme?: MomentTheme }) {
  const copy = siteConfig.copy.newsletter
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'error' | 'pending' | 'done'>('idle')
  const buttonRef = useMagnetic<HTMLButtonElement>(3)
  const subscribeMutation = trpc.newsletter.subscribe.useMutation()

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState('error')
      return
    }
    setState('pending')
    try {
      await subscribeMutation.mutateAsync({ email: value })
      setState('done')
      setEmail('')
    } catch {
      setState('error')
    }
  }

  const style = theme ? ({ '--nl-ink': theme.ink, '--nl-bg': theme.bg } as CSSProperties) : undefined

  return (
    <div className="newsletter" id="newsletter" data-reveal style={style}>
      <p className="newsletter__script">{copy.script}</p>
      <h2 className="newsletter__heading">{copy.heading}</h2>
      {state === 'done' ? (
        <p className="newsletter__success" role="status">
          {copy.successText}
        </p>
      ) : (
        <form className="newsletter__form" onSubmit={subscribe} noValidate>
          <label htmlFor="nl-email" className="sr-only">
            {copy.submitAria}
          </label>
          <input
            id="nl-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setState('idle')
            }}
            placeholder={copy.placeholder}
            aria-invalid={state === 'error'}
            required
          />
          <button ref={buttonRef} type="submit" aria-label={copy.submitAria} disabled={state === 'pending'}>
            {state === 'pending' ? '…' : copy.submitLabel}
          </button>
        </form>
      )}
      {state === 'error' ? (
        <p className="newsletter__error" role="alert">
          {copy.invalidText}
        </p>
      ) : null}
    </div>
  )
}
