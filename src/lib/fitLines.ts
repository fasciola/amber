/**
 * Display-title line fitting ("量体裁衣"): decide whether a title rides one
 * line, and when it must wrap, break it into width-balanced lines.
 *
 * Pure and DOM-free — the caller supplies a `measure` function (canvas text
 * metrics in the app, a fake metric in tests) so the algorithm is fully
 * unit-testable.
 */

export type MeasureFn = (text: string) => number

export interface FitLinesResult {
  /** The fitted lines (one when the title fits single-line). */
  lines: string[]
  /** True when the title fits on a single line within maxWidth. */
  single: boolean
  /** Measured width of each line (same units as `measure`). */
  widths: number[]
}

/**
 * Fit `text` into lines of at most `maxWidth`:
 * - single line whenever the whole string measures ≤ maxWidth (the caller's
 *   maxWidth is expected to already subtract the desired breathing room);
 * - otherwise the smallest line count that fits, split at word boundaries by
 *   DP minimizing the widest line (which also minimizes the line-to-line
 *   spread — balanced rags, not naive space-break-at-middle);
 * - pathological input (one word wider than maxWidth) falls back to one word
 *   per line so the result is always renderable.
 */
export function fitBalancedLines(text: string, maxWidth: number, measure: MeasureFn): FitLinesResult {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const full = words.join(' ')
  const fullW = measure(full)
  if (words.length <= 1 || fullW <= maxWidth) {
    return { lines: [full], single: true, widths: [fullW] }
  }

  const spaceW = measure(' ')
  const wordW = words.map((w) => measure(w))
  const lineW = (i: number, j: number) => {
    let w = 0
    for (let k = i; k < j; k++) w += wordW[k]
    return w + spaceW * (j - i - 1)
  }

  const n = words.length
  for (let lines = 2; lines <= n; lines++) {
    // dp[t][i] = minimal achievable "widest line" splitting the first i words
    // into exactly t lines; parent[t][i] = the split start that achieved it.
    const dp: number[][] = []
    const parent: number[][] = []
    for (let t = 0; t <= lines; t++) {
      dp.push(new Array<number>(n + 1).fill(Infinity))
      parent.push(new Array<number>(n + 1).fill(-1))
    }
    dp[0][0] = 0
    for (let t = 1; t <= lines; t++) {
      for (let i = t; i <= n; i++) {
        for (let j = t - 1; j < i; j++) {
          const widest = Math.max(dp[t - 1][j], lineW(j, i))
          if (widest < dp[t][i] - 1e-9) {
            dp[t][i] = widest
            parent[t][i] = j
          }
        }
      }
    }
    if (dp[lines][n] <= maxWidth + 1e-9) {
      // reconstruct
      const out: string[] = []
      let i = n
      for (let t = lines; t >= 1; t--) {
        const j = parent[t][i]
        out.unshift(words.slice(j, i).join(' '))
        i = j
      }
      return { lines: out, single: false, widths: out.map((l) => measure(l)) }
    }
  }
  // one word per line (a word alone exceeds maxWidth — render anyway)
  return { lines: words, single: false, widths: words.map((w) => measure(w)) }
}

/** Spread of a fitted result (max − min line width; 0 for a single line). */
export function lineSpread(result: FitLinesResult): number {
  if (result.widths.length <= 1) return 0
  return Math.max(...result.widths) - Math.min(...result.widths)
}
