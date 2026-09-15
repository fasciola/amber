import type { MomentImage, MomentLayout, SiteConfig } from '../types'

export interface ConfigIssue {
  path: string
  message: string
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
export const LAYOUTS: MomentLayout[] = ['ritual', 'immersive', 'editorial', 'collage', 'nightfall']

/** Slot cardinality contract per layout: [slot, min, max]. */
const LAYOUT_SLOTS: Record<MomentLayout, Array<[string, number, number]>> = {
  ritual: [],
  immersive: [
    ['bg', 1, 1],
    ['inset', 0, 1],
  ],
  editorial: [
    ['main', 1, 1],
    ['secondary', 0, 2],
  ],
  collage: [['frag', 2, 6]],
  nightfall: [['strip', 0, 4]],
}

/** Runtime validation for constraints TypeScript cannot protect after editing. */
export function validateConfig(config: SiteConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = []

  if (!/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(config.locale)) {
    issues.push({ path: 'locale', message: `locale "${config.locale}" is not a BCP-47 tag` })
  }
  if (!config.siteTitle.trim()) issues.push({ path: 'siteTitle', message: 'siteTitle must not be empty' })
  if (!config.brandName.trim()) issues.push({ path: 'brandName', message: 'brandName must not be empty' })

  const SOCIAL_STYLES = ['chip', 'poem', 'handles', 'marks'] as const
  if (config.socialStyle !== undefined && !SOCIAL_STYLES.includes(config.socialStyle)) {
    issues.push({ path: 'socialStyle', message: `"${config.socialStyle}" is not a known social style (${SOCIAL_STYLES.join(' | ')})` })
  }
  const socialMode = config.socialStyle ?? 'chip'
  if (config.socialPlacement !== undefined && config.socialPlacement !== 'edge' && config.socialPlacement !== 'header') {
    issues.push({ path: 'socialPlacement', message: `"${config.socialPlacement}" is not a known placement (edge | header)` })
  }
  config.socials.forEach((s, i) => {
    if (!s.label.trim()) issues.push({ path: `socials[${i}].label`, message: 'social label must not be empty' })
    if (!s.href.trim()) issues.push({ path: `socials[${i}].href`, message: 'social href must not be empty' })
    const BUILTIN = ['instagram', 'tiktok', 'youtube', 'x', 'facebook']
    if (s.icon !== undefined && !BUILTIN.includes(s.icon)) {
      issues.push({ path: `socials[${i}].icon`, message: `"${s.icon}" is not a built-in mark (${BUILTIN.join(' | ')}) — or supply iconSvg` })
    }
    if (s.icon === undefined && !(s.iconSvg ?? '').trim()) {
      issues.push({ path: `socials[${i}].icon`, message: 'a built-in icon or iconSvg is required' })
    }
    if (s.iconSvg !== undefined && (typeof s.iconSvg !== 'string' || !s.iconSvg.includes('<'))) {
      issues.push({ path: `socials[${i}].iconSvg`, message: 'iconSvg must be inline SVG inner markup (containing \'<\' element tags)' })
    }
    if (s.handle !== undefined && !s.handle.trim()) {
      issues.push({ path: `socials[${i}].handle`, message: 'handle must not be empty when present' })
    }
    if (socialMode !== 'marks' && !(s.handle ?? '').trim()) {
      issues.push({ path: `socials[${i}].handle`, message: `handle is required when socialStyle is "${socialMode}" (${s.label})` })
    }
  })

  if (config.fx !== undefined) {
    for (const key of ['dust', 'magnet', 'develop', 'pulse', 'drift', 'glow', 'dawn', 'stars', 'dawnCursor', 'sweep', 'caustics', 'meteor', 'horizon', 'breath', 'ripple'] as const) {
      if (config.fx[key] !== undefined && typeof config.fx[key] !== 'boolean') {
        issues.push({ path: `fx.${key}`, message: `${key} must be a boolean` })
      }
    }
    if (config.fx.rippleGain !== undefined) {
      const v = config.fx.rippleGain
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 1) {
        issues.push({ path: 'fx.rippleGain', message: `rippleGain "${v}" must be a number between 0 and 1` })
      }
    }
    if (config.fx.horizonY !== undefined) {
      const v = config.fx.horizonY
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 0.5) {
        issues.push({ path: 'fx.horizonY', message: `horizonY "${v}" must be a number between 0 and 0.5` })
      }
    }
    if (config.fx.horizonGain !== undefined) {
      const v = config.fx.horizonGain
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 1) {
        issues.push({ path: 'fx.horizonGain', message: `horizonGain "${v}" must be a number between 0 and 1` })
      }
    }
    if (config.fx.dawnMood !== undefined && config.fx.dawnMood !== 'first-light' && config.fx.dawnMood !== 'bright') {
      issues.push({ path: 'fx.dawnMood', message: `"${config.fx.dawnMood}" is not a known dawn mood (first-light | bright)` })
    }
    if (config.fx.dawnIntensity !== undefined) {
      const v = config.fx.dawnIntensity
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 1) {
        issues.push({ path: 'fx.dawnIntensity', message: `dawnIntensity "${v}" must be a number between 0 and 1` })
      }
    }
    if (config.fx.dawnSpeed !== undefined) {
      const v = config.fx.dawnSpeed
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0.2 || v > 2) {
        issues.push({ path: 'fx.dawnSpeed', message: `dawnSpeed "${v}" must be a number between 0.2 and 2` })
      }
    }
  }

  if (config.blend !== undefined) {
    if (config.blend.zoneVh !== undefined) {
      const v = config.blend.zoneVh
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 40) {
        issues.push({ path: 'blend.zoneVh', message: `zoneVh "${v}" must be a number between 0 and 40` })
      }
    }
    if (config.blend.link !== undefined && typeof config.blend.link !== 'boolean') {
      issues.push({ path: 'blend.link', message: 'link must be a boolean' })
    }
  }

  if (config.nav !== undefined) {
    if (config.nav.arcRiseVw !== undefined) {
      const v = config.nav.arcRiseVw
      if (typeof v !== 'number' || Number.isNaN(v) || v < 1 || v > 16) {
        issues.push({ path: 'nav.arcRiseVw', message: `arcRiseVw "${v}" must be a number between 1 and 16` })
      }
    }
    if (config.nav.breathe !== undefined && typeof config.nav.breathe !== 'boolean') {
      issues.push({ path: 'nav.breathe', message: 'breathe must be a boolean' })
    }
    for (const key of ['keys', 'follow', 'sunset', 'labels'] as const) {
      if (config.nav[key] !== undefined && typeof config.nav[key] !== 'boolean') {
        issues.push({ path: `nav.${key}`, message: `${key} must be a boolean` })
      }
    }
    if (config.nav.variant !== undefined && config.nav.variant !== 'dock' && config.nav.variant !== 'arc') {
      issues.push({ path: 'nav.variant', message: `"${config.nav.variant}" is not a known nav variant (dock | arc)` })
    }
    if (config.nav.dockTone !== undefined && config.nav.dockTone !== 'veil' && config.nav.dockTone !== 'solid') {
      issues.push({ path: 'nav.dockTone', message: `"${config.nav.dockTone}" is not a known dock tone (veil | solid)` })
    }
  }

  const count = config.moments.length
  if (count < 2) issues.push({ path: 'moments', message: 'Provide at least 2 moments' })
  if (count > 8) issues.push({ path: 'moments', message: 'No more than 8 moments are promised by the arc nav' })

  const ids = new Set<string>()
  config.moments.forEach((m, i) => {
    const path = `moments[${i}] (${m.id || '?'})`
    if (!KEBAB.test(m.id)) issues.push({ path: `${path}.id`, message: `"${m.id}" is not kebab-case` })
    if (ids.has(m.id)) issues.push({ path: `${path}.id`, message: `Duplicate id "${m.id}"` })
    ids.add(m.id)
    if (!m.label.trim()) issues.push({ path, message: 'label must not be empty' })
    if (!m.script.trim()) issues.push({ path, message: 'script (accent word) must not be empty' })
    if (!m.title.trim()) issues.push({ path, message: 'title must not be empty' })
    if (!m.body.trim()) issues.push({ path, message: 'body must not be empty' })
    if (m.cta && (!m.cta.label.trim() || !m.cta.href.trim())) {
      issues.push({ path: `${path}.cta`, message: 'cta label/href must not be empty when cta is present' })
    }

    if (!LAYOUTS.includes(m.layout)) {
      issues.push({ path: `${path}.layout`, message: `"${m.layout}" is not a known layout (${LAYOUTS.join(' | ')})` })
    } else {
      const rules = LAYOUT_SLOTS[m.layout]
      const allowed = rules.map(([slot]) => slot)
      m.images.forEach((item, k) => {
        if (!item.image.src.trim()) issues.push({ path: `${path}.images[${k}]`, message: 'image src must not be empty' })
        if (!allowed.includes(item.slot)) {
          issues.push({
            path: `${path}.images[${k}].slot`,
            message: `"${item.slot}" is not a slot of layout "${m.layout}" (${allowed.join(' | ') || 'no slots'})`,
          })
        }
        if (item.caption !== undefined && !item.caption.trim()) {
          issues.push({ path: `${path}.images[${k}].caption`, message: 'caption must not be empty when present' })
        }
      })
      for (const [slot, min, max] of rules) {
        const n = m.images.filter((item: MomentImage) => item.slot === slot).length
        if (n < min || n > max) {
          issues.push({
            path: `${path}.images`,
            message: `layout "${m.layout}" expects ${min === max ? min : `${min}–${max}`} "${slot}" image(s), got ${n}`,
          })
        }
      }
    }

    for (const key of ['bg', 'ink', 'subtle'] as const) {
      if (!HEX.test(m.theme[key])) {
        issues.push({ path: `${path}.theme.${key}`, message: `"${m.theme[key]}" is not a hex color` })
      }
    }
    if (m.theme.bgTo !== undefined && !HEX.test(m.theme.bgTo)) {
      issues.push({ path: `${path}.theme.bgTo`, message: `"${m.theme.bgTo}" is not a hex color` })
    }
    if (m.theme.bgVia !== undefined && !HEX.test(m.theme.bgVia)) {
      issues.push({ path: `${path}.theme.bgVia`, message: `"${m.theme.bgVia}" is not a hex color` })
    }
    for (const key of ['grain', 'vignette'] as const) {
      const v = m.theme[key]
      if (v !== undefined && (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 1)) {
        issues.push({ path: `${path}.theme.${key}`, message: `"${v}" must be a number between 0 and 1` })
      }
    }

    if (m.particles !== undefined) {
      const KINDS = ['dust', 'mist', 'pollen', 'heat', 'ember', 'night'] as const
      if (m.particles.kind !== undefined && !KINDS.includes(m.particles.kind)) {
        issues.push({ path: `${path}.particles.kind`, message: `"${m.particles.kind}" is not a known particle kind (${KINDS.join(' | ')})` })
      }
      if (m.particles.density !== undefined) {
        const v = m.particles.density
        if (typeof v !== 'number' || Number.isNaN(v) || v < 0.5 || v > 2) {
          issues.push({ path: `${path}.particles.density`, message: `"${v}" must be a number between 0.5 and 2` })
        }
      }
      if (m.particles.speed !== undefined) {
        const v = m.particles.speed
        if (typeof v !== 'number' || Number.isNaN(v) || v < 0.2 || v > 2) {
          issues.push({ path: `${path}.particles.speed`, message: `"${v}" must be a number between 0.2 and 2` })
        }
      }
      if (m.particles.tint !== undefined && !HEX.test(m.particles.tint)) {
        issues.push({ path: `${path}.particles.tint`, message: `"${m.particles.tint}" is not a hex color` })
      }
    }
  })

  if (config.copy.newsletter.heading.trim() === '') {
    issues.push({ path: 'copy.newsletter.heading', message: 'newsletter heading must not be empty' })
  }
  return issues
}
