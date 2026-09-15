import { describe, expect, it } from 'vitest'
import { fitBalancedLines, lineSpread } from '../src/lib/fitLines'

/** Fake monospace metric: every character (incl. spaces) is 10 units wide. */
const mono = (s: string) => s.length * 10

describe('fitBalancedLines', () => {
  it('keeps a title on one line when it fits (with breathing room already priced in)', () => {
    const r = fitBalancedLines('Start where the light starts', 300, mono) // 280 ≤ 300
    expect(r.single).toBe(true)
    expect(r.lines).toEqual(['Start where the light starts'])
    expect(r.widths[0]).toBe(280)
  })

  it('accepts an exact fit at maxWidth (≤, not <)', () => {
    const r = fitBalancedLines('Start where the light starts', 280, mono)
    expect(r.single).toBe(true)
  })

  it('balances two lines by width, not by word count', () => {
    // naive "half the words" split would give AAAAA | BB CC DD EE (50 vs 110);
    // the balanced optimum is AAAAA BB | CC DD EE (80 vs 80)
    const r = fitBalancedLines('AAAAA BB CC DD EE', 120, mono)
    expect(r.single).toBe(false)
    expect(r.lines).toEqual(['AAAAA BB', 'CC DD EE'])
    expect(lineSpread(r)).toBe(0)
  })

  it('minimizes the widest line (equal words → zero spread)', () => {
    const r = fitBalancedLines('AAAA BBBB CCCC DDDD', 150, mono)
    expect(r.lines).toEqual(['AAAA BBBB', 'CCCC DDDD'])
    expect(lineSpread(r)).toBe(0)
  })

  it('uses the smallest line count that fits, then balances', () => {
    // two lines cannot fit under 70 (best two-line widest is 80) → three lines
    const r = fitBalancedLines('AAAAA BB CC DD EE', 70, mono)
    expect(r.lines.length).toBe(3)
    expect(Math.max(...r.widths)).toBeLessThanOrEqual(70)
    // and the three lines are as even as possible
    expect(lineSpread(r)).toBeLessThanOrEqual(40)
  })

  it('falls back to one word per line when a single word exceeds maxWidth', () => {
    const r = fitBalancedLines('SUPERCALIFRAGILISTIC AA', 60, mono)
    expect(r.lines).toEqual(['SUPERCALIFRAGILISTIC', 'AA'])
  })

  it('handles single-word and empty input without crashing', () => {
    expect(fitBalancedLines('Alba', 10, mono).lines).toEqual(['Alba'])
    expect(fitBalancedLines('   ', 10, mono).lines).toEqual([''])
  })
})
