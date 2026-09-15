import { describe, expect, it } from 'vitest'
import { siteConfig } from '../src/config'
import { validateConfig } from '../src/lib/validateConfig'
import type { SiteConfig } from '../src/types'

const clone = (): SiteConfig => JSON.parse(JSON.stringify(siteConfig)) as SiteConfig

describe('validateConfig (day-moments)', () => {
  it('accepts the shipped sample config', () => {
    expect(validateConfig(siteConfig)).toEqual([])
  })

  it('flags duplicate moment ids', () => {
    const config = clone()
    config.moments[1].id = config.moments[0].id
    expect(validateConfig(config).some((i) => i.message.includes('Duplicate'))).toBe(true)
  })

  it('flags non-kebab ids', () => {
    const config = clone()
    config.moments[0].id = 'Golden Hour'
    expect(validateConfig(config).some((i) => i.message.includes('kebab-case'))).toBe(true)
  })

  it('flags too few and too many moments', () => {
    const tooFew = clone()
    tooFew.moments = tooFew.moments.slice(0, 1)
    expect(validateConfig(tooFew).some((i) => i.path === 'moments')).toBe(true)
    const tooMany = clone()
    const base = tooMany.moments[0]
    tooMany.moments = Array.from({ length: 9 }, (_, i) => ({ ...base, id: `moment-${i}` }))
    expect(validateConfig(tooMany).some((i) => i.path === 'moments')).toBe(true)
  })

  it('flags bad hex colors', () => {
    const config = clone()
    config.moments[0].theme.bg = 'periwinkle'
    expect(validateConfig(config).some((i) => i.message.includes('hex color'))).toBe(true)
  })

  it('flags empty cta label when cta present', () => {
    const config = clone()
    config.moments[0].cta = { label: ' ', href: '#x' }
    expect(validateConfig(config).some((i) => i.path.includes('cta'))).toBe(true)
  })

  it('flags unknown layouts', () => {
    const config = clone()
    config.moments[0].layout = 'mosaic' as never
    expect(validateConfig(config).some((i) => i.message.includes('not a known layout'))).toBe(true)
  })

  it('flags images on a ritual moment and wrong slots per layout', () => {
    const config = clone()
    const ritual = config.moments.find((m) => m.layout === 'ritual')!
    ritual.images.push({ image: { src: '/media/x.jpg', alt: 'x' }, slot: 'frag' })
    const immersive = config.moments.find((m) => m.layout === 'immersive')!
    immersive.images[0].slot = 'frag'
    const issues = validateConfig(config)
    expect(issues.some((i) => i.message.includes('not a slot of layout "ritual"'))).toBe(true)
    expect(issues.some((i) => i.message.includes('not a slot of layout "immersive"'))).toBe(true)
  })

  it('flags missing bg on immersive and too few frags on collage', () => {
    const config = clone()
    const immersive = config.moments.find((m) => m.layout === 'immersive')
    const collage = config.moments.find((m) => m.layout === 'collage')
    if (!immersive && !collage) return // this shipped config carries neither slot contract to break
    if (immersive) immersive.images = immersive.images.filter((i) => i.slot !== 'bg')
    if (collage) collage.images = collage.images.slice(0, 1)
    const issues = validateConfig(config)
    if (immersive) expect(issues.some((i) => i.message.includes('1 "bg" image(s)'))).toBe(true)
    if (collage) expect(issues.some((i) => i.message.includes('2–6 "frag" image(s)'))).toBe(true)
  })

  it('flags empty image src and empty caption', () => {
    const config = clone()
    config.moments[1].images[0].image.src = ''
    config.moments[1].images[1].caption = '  '
    const issues = validateConfig(config)
    expect(issues.some((i) => i.message.includes('src must not be empty'))).toBe(true)
    expect(issues.some((i) => i.message.includes('caption must not be empty'))).toBe(true)
  })

  it('flags out-of-range texture params', () => {
    const config = clone()
    config.moments[0].theme.grain = 1.5
    config.moments[0].theme.vignette = -0.2
    const issues = validateConfig(config)
    expect(issues.some((i) => i.path.includes('theme.grain'))).toBe(true)
    expect(issues.some((i) => i.path.includes('theme.vignette'))).toBe(true)
  })

  it('flags bad nav params', () => {
    const config = clone()
    config.nav = { arcRiseVw: 40 }
    expect(validateConfig(config).some((i) => i.path === 'nav.arcRiseVw')).toBe(true)
    const ok = clone()
    ok.nav = { arcRiseVw: 6, breathe: false }
    expect(validateConfig(ok)).toEqual([])
  })

  it('flags missing social handle in handles mode and bad social style', () => {
    const entry = () => ({ label: 'Instagram', href: '#', icon: 'instagram' as const, handle: 'alba.test' })
    const config = clone()
    config.socials = [entry()]
    config.socials[0].handle = ' '
    const issues = validateConfig(config)
    expect(issues.some((i) => i.message.includes('handle is required'))).toBe(true)
    const marks = clone()
    marks.socials = [entry()]
    marks.socialStyle = 'marks'
    delete marks.socials[0].handle
    expect(validateConfig(marks)).toEqual([])
    const bad = clone()
    bad.socials = [entry()]
    bad.socialStyle = 'glyphs' as never
    expect(validateConfig(bad).some((i) => i.path === 'socialStyle')).toBe(true)
  })

  it('flags missing icon/bad iconSvg, accepts icon-free custom marks', () => {
    const entry = () => ({ label: 'Instagram', href: '#', icon: 'instagram' as const, handle: 'alba.test' })
    const noIcon = clone()
    noIcon.socials = [entry()]
    delete noIcon.socials[0].icon
    delete noIcon.socials[0].iconSvg
    expect(validateConfig(noIcon).some((i) => i.path === 'socials[0].icon' && i.message.includes('required'))).toBe(true)
    const badBuiltin = clone()
    badBuiltin.socials = [entry()]
    badBuiltin.socials[0].icon = 'wechat' as never
    expect(validateConfig(badBuiltin).some((i) => i.path === 'socials[0].icon')).toBe(true)
    const badSvg = clone()
    badSvg.socials = [entry()]
    badSvg.socials[0].iconSvg = 'not-markup'
    expect(validateConfig(badSvg).some((i) => i.path === 'socials[0].iconSvg')).toBe(true)
    const customOnly = clone()
    customOnly.socials = [entry()]
    delete customOnly.socials[0].icon
    customOnly.socials[0].iconSvg = '<path d="M5 5l14 14"/>'
    expect(validateConfig(customOnly)).toEqual([])
  })

  it('flags bad blend params', () => {
    const config = clone()
    config.blend = { zoneVh: 55 }
    expect(validateConfig(config).some((i) => i.path === 'blend.zoneVh')).toBe(true)
    const ok = clone()
    ok.blend = { zoneVh: 0, link: false }
    expect(validateConfig(ok)).toEqual([])
  })

  it('flags bad particle params', () => {
    const config = clone()
    config.moments[0].particles = { kind: 'snow' as never }
    expect(validateConfig(config).some((i) => i.path.includes('particles.kind'))).toBe(true)
    const badDensity = clone()
    badDensity.moments[0].particles = { density: 3 }
    expect(validateConfig(badDensity).some((i) => i.path.includes('particles.density'))).toBe(true)
    const badSpeed = clone()
    badSpeed.moments[0].particles = { speed: 0.1 }
    expect(validateConfig(badSpeed).some((i) => i.path.includes('particles.speed'))).toBe(true)
    const badTint = clone()
    badTint.moments[0].particles = { tint: 'gold' }
    expect(validateConfig(badTint).some((i) => i.path.includes('particles.tint'))).toBe(true)
    const ok = clone()
    ok.moments[0].particles = { kind: 'mist', density: 1.5, speed: 1.2, tint: '#eec27f' }
    expect(validateConfig(ok)).toEqual([])
    const noParticles = clone()
    delete noParticles.moments[0].particles
    expect(validateConfig(noParticles)).toEqual([])
  })

  it('flags bad dawn mood and fx types', () => {
    const config = clone()
    config.fx = { ...config.fx, dawnMood: 'noon' as never }
    expect(validateConfig(config).some((i) => i.path === 'fx.dawnMood')).toBe(true)
    const badNum = clone()
    badNum.fx = { ...badNum.fx, dawnSpeed: 5 }
    expect(validateConfig(badNum.fx ? badNum : badNum).some((i) => i.path === 'fx.dawnSpeed')).toBe(true)
    const ok = clone()
    ok.fx = { ...ok.fx, dawnMood: 'bright', sweep: false, caustics: false, meteor: false }
    expect(validateConfig(ok)).toEqual([])
  })
})
