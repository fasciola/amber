/* Small color helpers shared by sections and the CTA. */

/** '#rgb' | '#rrggbb' → { r, g, b } (0–255). Falls back to black on bad input. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Relative luminance 0–1 (simple weighted, good enough for tone decisions). */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** '#rrggbb' + alpha 0–1 → 'rgba(r, g, b, a)'. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Linear RGB mix of two hex colors at t (0 → a, 1 → b). */
export function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  const c = (x: number, y: number) => Math.round(Math.min(255, Math.max(0, x + (y - x) * t)))
  return `#${[c(A.r, B.r), c(A.g, B.g), c(A.b, B.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Picks a readable text color against a background (e.g. CTA label on ink). */
export function readableOn(bgHex: string): string {
  return luminance(bgHex) < 0.5 ? '#fffff0' : '#232323'
}
