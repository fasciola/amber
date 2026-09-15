import type { SiteConfig } from './types'

/**
 * NOCTURE — an immersive beauty retail house told through the hours of an
 * evening: the threshold, the boutique, the collection, the craft, and the
 * hours after midnight. Luxury dark-noir palette — lacquer black, smoked
 * bronze, candle gold — with the full ambient motion layer on.
 */

export const siteConfig: SiteConfig = {
  locale: 'en-US',
  siteTitle: 'NOCTURE — Beauty, composed after dark',
  siteDescription:
    'An immersive beauty retail experience: step out of the day and into a house of evening rituals — fragrance, colour, and light composed in noir and gold.',
  brandName: 'NOCTURE',
  socials: [
    { label: 'Instagram', href: '#', icon: 'instagram', handle: '@nocture.house' },
    { label: 'TikTok', href: '#', icon: 'tiktok', handle: '@nocture.house' },
    { label: 'YouTube', href: '#', icon: 'youtube', handle: '@nocturehouse' },
  ],
  socialStyle: 'poem',
  socialPlacement: 'edge',
  blend: { zoneVh: 26, link: true },
  fx: {
    dust: true,
    magnet: true,
    develop: true,
    pulse: true,
    drift: true,
    glow: true,
    dawn: true,
    stars: true,
    dawnCursor: true,
    dawnMood: 'first-light',
    dawnIntensity: 0.85,
    dawnSpeed: 1,
    sweep: true,
    caustics: true,
    meteor: true,
    horizon: true,
    horizonY: 0.08,
    horizonGain: 0.55,
    breath: true,
    ripple: true,
    rippleGain: 0.7,
  },
  nav: { variant: 'dock', labels: true, dockTone: 'veil', arcRiseVw: 8, breathe: true, keys: true, follow: true, sunset: true },
  moments: [
    {
      id: 'threshold',
      label: 'Threshold',
      script: 'Step out of the day',
      title: 'Beauty begins where the day ends',
      body: 'Some houses open at dawn. Ours opens when the light turns to honey and the city exhales. Leave the noise at the door — everything inside is composed for the evening version of you.',
      cta: { label: 'Enter the house', href: '#the-boutique' },
      layout: 'ritual',
      images: [],
      particles: { kind: 'mist', tint: '#d9b45c', density: 1, speed: 0.8 },
      theme: { bg: '#0b0906', bgTo: '#17110a', ink: '#f2e4c2', subtle: '#9b8a63', grain: 0.5, vignette: 0.3 },
    },
    {
      id: 'the-boutique',
      label: 'The Boutique',
      script: 'A room that glows',
      title: 'Retail as a candlelit theatre',
      body: 'Black marble underfoot, brass at your fingertips, and a single beam of warm light on every bottle. Our flagship is not a shop floor — it is a stage where each formula waits for its scene with you.',
      layout: 'immersive',
      images: [
        {
          image: {
            src: '/media/boutique-hero.jpg',
            alt: 'A dark luxury beauty boutique with brass shelving and warm spotlights',
            position: '50% 45%',
          },
          slot: 'bg',
        },
        {
          image: { src: '/media/perfume-inset.jpg', alt: 'An amber perfume flacon on black marble in gold light' },
          slot: 'inset',
          caption: 'No. IX — amber, oud, and a little defiance.',
        },
      ],
      particles: { kind: 'ember', tint: '#e8c56a', density: 1, speed: 0.9 },
      theme: { bg: '#1a1308', ink: '#f5ead0', subtle: '#a68d5e', grain: 0.42, vignette: 0.34 },
    },
    {
      id: 'the-collection',
      label: 'The Collection',
      script: 'Objects of the evening',
      title: 'Every piece keeps an hour',
      body: 'The collection is arranged like a night well spent: a serum for the first glass of something golden, a lip colour for the conversation that runs long, a cream for the quiet return home.',
      layout: 'collage',
      images: [
        { image: { src: '/media/frag-serum.jpg', alt: 'A gold dropper serum bottle against a dark backdrop' }, slot: 'frag', caption: '19:04 · first light of the evening' },
        { image: { src: '/media/frag-lipstick.jpg', alt: 'A noir and gold lipstick bullet, uncapped' }, slot: 'frag', caption: '20:37 · the long conversation' },
        { image: { src: '/media/frag-cream.jpg', alt: 'A black cream jar with a golden lid, open' }, slot: 'frag', caption: '22:12 · the quiet return' },
        { image: { src: '/media/frag-compact.jpg', alt: 'A gold powder compact resting on dark silk' }, slot: 'frag', caption: '21:05 · silk and powder' },
        { image: { src: '/media/frag-candle.jpg', alt: 'A lit candle in smoked glass beside beauty bottles' }, slot: 'frag', caption: '23:48 · the last flame' },
      ],
      particles: { kind: 'heat', tint: '#f0d68a', density: 1, speed: 1 },
      theme: { bg: '#2a1f0e', bgVia: '#1c1610', ink: '#f3e6c8', subtle: '#a8905f', grain: 0.5, vignette: 0.3 },
    },
    {
      id: 'the-craft',
      label: 'The Craft',
      script: 'Poured by hand, at night',
      title: 'Formulated in the small hours',
      body: 'Our atelier works after midnight, when the air is cool and still enough for the rarest materials to behave. Oud aged eleven years. Amber warmed, never rushed. Gold leaf folded into balms one jar at a time — numbered, dated, signed.',
      cta: { label: 'Reserve a private consultation', href: '#newsletter' },
      layout: 'editorial',
      images: [
        {
          image: { src: '/media/craft-main.jpg', alt: 'An artisan pouring a golden balm by hand in a dark atelier' },
          slot: 'main',
          caption: 'Batch 214 — poured at 02:10, rested until spring.',
        },
        { image: { src: '/media/craft-ingredients.jpg', alt: 'Oud chips, amber resin and gold leaf on dark slate' }, slot: 'secondary' },
        { image: { src: '/media/craft-texture.jpg', alt: 'Close-up of a gold-flecked cream texture' }, slot: 'secondary' },
      ],
      particles: { kind: 'ember', tint: '#f6c45e', density: 1, speed: 0.75 },
      theme: { bg: '#46351a', bgVia: '#241c10', ink: '#f7eed6', subtle: '#c8ad78', grain: 0.55, vignette: 0.4 },
    },
    {
      id: 'after-midnight',
      label: 'After Midnight',
      script: 'Stay on the list',
      title: 'The house keeps a few doors closed',
      body: 'Private evenings, first pours of new batches, and invitations we never post publicly. Leave your address and the house will know where to find you.',
      layout: 'nightfall',
      images: [
        { image: { src: '/media/strip-vanity.jpg', alt: 'A candlelit vanity arranged with noir beauty products' }, slot: 'strip' },
        { image: { src: '/media/strip-silhouette.jpg', alt: 'A silhouette in evening light wearing gold earrings' }, slot: 'strip' },
        { image: { src: '/media/strip-window.jpg', alt: 'A dark room with a window glowing over city lights' }, slot: 'strip' },
      ],
      particles: { kind: 'night', tint: '#e3cf9a', density: 1, speed: 1 },
      theme: { bg: '#070605', bgTo: '#0d0b08', ink: '#e9dcb8', subtle: '#8f8266', grain: 0.6, vignette: 0.55 },
    },
  ],
  copy: {
    skipLink: 'Skip to content',
    navAria: 'Evening timeline',
    newsletter: {
      heading: 'Join the house list',
      script: 'After midnight',
      placeholder: 'Your email address',
      submitLabel: 'Request entry',
      submitAria: 'Join the NOCTURE house list',
      successText: 'You are on the list. The next invitation leaves the house soon.',
      invalidText: 'Please enter a valid email address.',
    },
    footer: {
      tagline: 'Beauty, composed after dark.',
      smallLinks: [
        { label: 'Privacy Policy', href: '#' },
        { label: 'Shipping & Returns', href: '#' },
        { label: 'Contact', href: 'mailto:house@nocture.example' },
      ],
      copyright: '© 2026 NOCTURE',
    },
  },
}
