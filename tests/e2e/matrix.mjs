/**
 * Day Moments browser acceptance matrix (see info.md).
 * Runs against a served build (dev server or `vite preview`).
 *
 *   E2E_BASE=http://localhost:4173 npm run test:e2e
 *
 * Config-aware: every expectation (moment count, ids, labels, layouts, slot
 * counts, captions, theme colors) is derived from src/config.ts, so consumer
 * adaptations re-run the same script against their own config.
 *
 * Best-effort: skips cleanly (exit 0) when playwright-core or a chromium
 * executable is unavailable in the current environment.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function findChromium() {
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright')
  const candidates = []
  try {
    for (const dir of fs.readdirSync(cache)) {
      for (const rel of [
        'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
        'chrome-linux/chrome',
        'chrome-win/chrome.exe',
      ]) {
        const p = path.join(cache, dir, rel)
        if (fs.existsSync(p)) candidates.push(p)
      }
    }
  } catch {
    return null
  }
  return candidates.sort().pop() ?? null
}

const EXE = findChromium()
if (!EXE) {
  console.log('SKIP  no chromium executable found — e2e matrix skipped')
  process.exit(0)
}
const { chromium } = await import('playwright-core').catch(() => {
  console.log('SKIP  playwright-core not installed — e2e matrix skipped')
  process.exit(0)
})

const { siteConfig } = await import(new URL('../../src/config.ts', import.meta.url))
const { effectiveTheme } = await import(new URL('../../src/lib/theme.ts', import.meta.url))
const M = siteConfig.moments
const EFF = M.map((m) => effectiveTheme(m, siteConfig))
const NAV_VARIANT = siteConfig.nav?.variant ?? 'dock'
const DOCK_LABELS = siteConfig.nav?.labels ?? true
const SOCIAL_PLACEMENT = siteConfig.socialPlacement ?? 'edge'
// bottom-chrome clearance band: arc = stroke + labels above the river; dock = bar + margin
const bandTopFor = (vh, navH, vw) =>
  NAV_VARIANT === 'arc'
    ? vh - (14 + Math.max(10, Math.min(navH - 30, ((siteConfig.nav?.arcRiseVw ?? 8) / 100) * vw)) + 34)
    : vh - (navH + 20)
const IDS = M.map((m) => m.id)
const FIRST = M[0]
const LAST = M[M.length - 1]
// config-aware anchors: checks must hold for any 2–8 moment adaptation
const N = M.length
const MID = Math.min(2, N - 1)
const RITUAL_I = M.findIndex((m) => m.layout === 'ritual')
const NIGHTFALL_I = M.findIndex((m) => m.layout === 'nightfall')
const COLLAGE_I = M.findIndex((m) => m.layout === 'collage')
const RITUAL_ID = RITUAL_I >= 0 ? M[RITUAL_I].id : null
const NIGHTFALL_ID = NIGHTFALL_I >= 0 ? M[NIGHTFALL_I].id : null
const DAWN_ON = RITUAL_ID !== null && siteConfig.fx?.dawn !== false

const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const BASE = process.env.E2E_BASE || 'http://localhost:3004'
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true })

  /* ---------- desktop narrative flow ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const consoleErrors = []
    page.on('pageerror', (e) => consoleErrors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1400)

    check('desktop: hero moment renders script + title', await page.isVisible('.moment__script') && await page.isVisible('.moment__title'))
    const moments = await page.$$eval('.moment', (els) => els.length)
    check('desktop: moment count matches config', moments === M.length, `count=${moments} want=${M.length}`)

    // --- bottom chrome nav structure (dock default / arc fallback) ---
    const navStruct = await page.evaluate(() => ({
      dock: !!document.querySelector('.sundial-dock'),
      arcSvg: !!document.querySelector('.timeline-nav__svg'),
      track: !!document.querySelector('.timeline-nav__track'),
      progress: !!document.querySelector('.timeline-nav__progress'),
      sun: !!document.querySelector('.timeline-nav__sun'),
      markers: document.querySelectorAll('.timeline-nav__markers a').length,
      innerH: Math.round(document.querySelector('.sundial-dock__inner')?.getBoundingClientRect().height ?? 0),
    }))
    const structOk =
      NAV_VARIANT === 'arc'
        ? navStruct.arcSvg && navStruct.track && navStruct.progress && navStruct.markers === M.length
        : navStruct.dock && navStruct.track && navStruct.progress && navStruct.sun && navStruct.markers === M.length && navStruct.innerH > 0 && navStruct.innerH <= 64
    check(`${NAV_VARIANT} nav: structure + one marker per moment`, structOk, JSON.stringify(navStruct))

    const labelState = await page.evaluate(() =>
      [...document.querySelectorAll('.timeline-nav__markers a')].map((a) => {
        const label = a.querySelector('.timeline-nav__label')
        return {
          active: a.classList.contains('is-active'),
          opacity: getComputedStyle(label).opacity,
          fontSize: parseFloat(getComputedStyle(label).fontSize),
        }
      }),
    )
    const labelsOk =
      NAV_VARIANT === 'arc'
        ? labelState[0].opacity === '1' && labelState[1].opacity === '0'
        : DOCK_LABELS
          ? labelState.every((l) => parseFloat(l.opacity) >= 0.7 && l.fontSize >= 12) && labelState.some((l) => l.active && l.opacity === '1')
          : labelState[0].opacity === '1' && labelState[1].opacity === '0'
    check(
      `${NAV_VARIANT} nav: labels visible ≥12px (active lit) / arc reveals on active`,
      labelsOk,
      JSON.stringify(labelState.map((l) => [l.active, l.opacity, l.fontSize])),
    )

    // --- dock stops: hollow ring idles → solid fill on activation ---
    if (NAV_VARIANT === 'dock') {
      const stops = await page.evaluate(() => {
        const read = (a) => {
          const cs = getComputedStyle(a.querySelector('.timeline-nav__dot'))
          return { bg: cs.backgroundColor, borderStyle: cs.borderTopStyle, borderW: parseFloat(cs.borderTopWidth) }
        }
        const idle = document.querySelector('.timeline-nav__markers a:not(.is-active)')
        const active = document.querySelector('.timeline-nav__markers a.is-active')
        return { idle: idle ? read(idle) : null, active: active ? read(active) : null }
      })
      const stopsOk =
        stops.idle &&
        stops.active &&
        (stops.idle.bg === 'rgba(0, 0, 0, 0)' || stops.idle.bg === 'transparent') &&
        stops.idle.borderStyle === 'solid' &&
        stops.idle.borderW > 0 &&
        stops.active.bg !== 'rgba(0, 0, 0, 0)' &&
        stops.active.bg !== 'transparent'
      check('dock nav: stops read as hollow rings idle, filled when active', !!stopsOk, JSON.stringify(stops))
    }

    // --- deep link ---
    await page.goto(`${BASE}/#${IDS[MID]}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const deepActive = await page.textContent('.timeline-nav__markers a.is-active .timeline-nav__name')
    check('deep-link: #id lands on the right moment', deepActive?.trim() === M[MID].label, `active=${deepActive} want=${M[MID].label}`)

    // --- scrollspy follows viewport ---
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }), IDS[1])
    await page.waitForTimeout(1200)
    const follow = await page.textContent('.timeline-nav__markers a.is-active .timeline-nav__name')
    check('scrollspy: active label follows viewport', follow?.trim() === M[1].label, `active=${follow} want=${M[1].label}`)

    // --- nav click jumps + highlights + hash ---
    await page.click(`.timeline-nav__markers a[href="#${LAST.id}"]`)
    await page.waitForTimeout(1700)
    const clickState = await page.evaluate(() => ({
      active: document.querySelector('.timeline-nav__markers a.is-active .timeline-nav__name')?.textContent?.trim(),
      hash: window.location.hash,
    }))
    check(`${NAV_VARIANT} nav: click jumps + highlights + sets hash`, clickState.active === LAST.label && clickState.hash === `#${LAST.id}`, JSON.stringify(clickState))

    const river = await page.evaluate(() => {
      const p = document.querySelector('.timeline-nav__progress')
      const fill = document.querySelector('.sundial-dock__fill')
      return {
        total: parseFloat(p.getAttribute('stroke-dasharray') ?? '0'),
        offset: parseFloat(p.getAttribute('stroke-dashoffset') ?? '0'),
        fillPct: fill ? parseFloat(fill.style.width || '0') : null,
      }
    })
    const riverOk =
      NAV_VARIANT === 'arc'
        ? river.offset < river.total * 0.02
        : river.fillPct !== null && river.fillPct >= 100 - 100 / M.length - 3
    check(`${NAV_VARIANT} nav: progress fills up to the active marker`, riverOk, JSON.stringify(river))

    // --- layouts: class contract + per-layout structure ---
    const layoutInfo = await page.evaluate((expected) => {
      const sections = [...document.querySelectorAll('.moment')]
      const byId = Object.fromEntries(
        sections.map((s) => [
          s.id,
          {
            layoutClass: [...s.classList].find((c) => c.startsWith('moment--')),
            imgs: s.querySelectorAll('.moment__img').length,
            frags: s.querySelectorAll('.moment__img--frag').length,
            hasBg: !!s.querySelector('.moment__img--bg'),
            hasMain: !!s.querySelector('.moment__img--main'),
            hasForm: !!s.querySelector('#nl-email'),
            captions: [...s.querySelectorAll('.moment__caption')].map((c) => c.textContent.trim()),
          },
        ]),
      )
      return { byId, distinct: new Set(sections.map((s) => [...s.classList].find((c) => c.startsWith('moment--')))).size, want: expected }
    }, M.length)
    const layoutClassOk = M.every((m) => layoutInfo.byId[m.id]?.layoutClass === `moment--${m.layout}`)
    const distinctWant = new Set(M.map((m) => m.layout)).size
    check('layouts: every section carries its configured layout class', layoutClassOk && layoutInfo.distinct === distinctWant, `distinct=${layoutInfo.distinct}/${distinctWant}`)

    const ritualOk = M.filter((m) => m.layout === 'ritual').every((m) => layoutInfo.byId[m.id].imgs === 0)
    check('layout ritual: pure text, no images', ritualOk)

    const immersiveOk = await page.evaluate((ids) => {
      return ids.every((id) => {
        const img = document.querySelector(`#${id} .moment__img--bg img`)
        return img && img.complete && img.naturalWidth > 0
      })
    }, M.filter((m) => m.layout === 'immersive').map((m) => m.id))
    check('layout immersive: full-bleed bg photograph loaded', immersiveOk)

    const captionOk = M.every((m) => {
      const want = m.images.filter((i) => i.caption).map((i) => i.caption)
      const got = layoutInfo.byId[m.id].captions
      return want.every((c) => got.includes(c))
    })
    check('layout editorial/immersive: configured captions render', captionOk)

    const collageOk = M.filter((m) => m.layout === 'collage').every(
      (m) => layoutInfo.byId[m.id].frags === m.images.filter((i) => i.slot === 'frag').length,
    )
    check('layout collage: fragment count matches config', collageOk)

    const editorialOk = M.filter((m) => m.layout === 'editorial').every((m) => layoutInfo.byId[m.id].hasMain)
    check('layout editorial: main plate present', editorialOk)

    const nightfallOk = M.filter((m) => m.layout === 'nightfall').every((m) => layoutInfo.byId[m.id].hasForm)
    check('layout nightfall: newsletter form lives in the closing section', nightfallOk)

    // --- atmosphere palette: distinct, config-matched, warm-paper ---
    const palette = await page.evaluate(() =>
      [...document.querySelectorAll('.moment')].map((s) => {
        const m = getComputedStyle(s).backgroundColor.match(/\d+/g).map(Number)
        return { id: s.id, r: m[0], g: m[1], b: m[2] }
      }),
    )
    const paletteMatch = palette.every((p) => {
      const want = hexToRgb(M.find((m) => m.id === p.id).theme.bg)
      return p.r === want.r && p.g === want.g && p.b === want.b
    })
    const distinctBg = new Set(palette.map((p) => `${p.r},${p.g},${p.b}`)).size === palette.length
    const skyBlue = palette.filter((p) => {
      const lightness = (Math.max(p.r, p.g, p.b) + Math.min(p.r, p.g, p.b)) / 2 / 255
      return p.b > p.r + 30 && p.g > p.r && lightness > 0.55
    })
    const warmLight = palette.every((p) => {
      const lum = (0.299 * p.r + 0.587 * p.g + 0.114 * p.b) / 255
      return lum <= 0.55 || p.r >= p.b
    })
    check(
      'palette: per-moment themes distinct + match config + warm-paper',
      paletteMatch && distinctBg && skyBlue.length === 0 && warmLight,
      `match=${paletteMatch} distinct=${distinctBg} sky=${skyBlue.length} warm=${warmLight}`,
    )

    // --- reveal fired for in-view content ---
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }), LAST.id)
    await page.waitForTimeout(1200)
    const revealed = await page.evaluate((id) => {
      const c = document.getElementById(id)?.querySelector('.moment__content')
      return c ? getComputedStyle(c).opacity : '0'
    }, LAST.id)
    check('reveal: in-view content becomes visible', revealed === '1', `opacity=${revealed}`)

    // --- docked section titles clear the fixed header (+ veil present) ---
    const clearances = await page.evaluate(async (args) => {
      const [idList, variant, arcRiseVw] = args
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const out = []
      for (const id of idList) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
        await sleep(650)
        const header = document.querySelector('.site-header').getBoundingClientRect()
        const sec = document.getElementById(id)
        const title = sec.querySelector('.moment__title').getBoundingClientRect()
        const script = sec.querySelector('.moment__script').getBoundingClientRect()
        const navH = document.querySelector('.timeline-nav').getBoundingClientRect().height
        const rise = Math.max(10, Math.min(navH - 30, (arcRiseVw / 100) * innerWidth))
        const bandTop = variant === 'arc' ? innerHeight - (14 + rise + 34) : innerHeight - (navH + 20)
        const imgs = [...sec.querySelectorAll('.moment__img')]
          .filter((f) => !f.classList.contains('moment__img--bg'))
          .map((f) => f.getBoundingClientRect().bottom)
        out.push({
          id,
          titleTop: title.top,
          headerBottom: header.bottom,
          scriptBottom: script.bottom,
          titleBottom: title.bottom,
          bandTop,
          imgBottom: imgs.length ? Math.max(...imgs) : 0,
          padBottom: parseFloat(getComputedStyle(sec).paddingBottom),
        })
      }
      return out
    }, [IDS, NAV_VARIANT, siteConfig.nav?.arcRiseVw ?? 8])
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }), IDS[0])
    const titlesOk = clearances.every((c) => c.titleTop >= c.headerBottom - 1)
    const veil = await page.evaluate(() => {
      const bg = getComputedStyle(document.querySelector('.site-header'), '::before').backgroundImage
      return bg && bg !== 'none'
    })
    check('docked titles clear the fixed header (+ veil)', titlesOk && !!veil, JSON.stringify(clearances.map((c) => [c.id, Math.round(c.titleTop), Math.round(c.headerBottom)])))

    // --- accent/copy/positioned images clear the bottom chrome band ---
    const navRectH = await page.evaluate(() => document.querySelector('.timeline-nav').getBoundingClientRect().height)
    const copyOk = clearances.every((c) => c.scriptBottom <= c.bandTop && c.titleBottom <= c.bandTop && c.imgBottom <= c.bandTop)
    const padOk = clearances.every((c) => c.padBottom >= navRectH + 20)
    check(
      `script/title/images clear the ${NAV_VARIANT} band (+ sections pad ≥ chrome height)`,
      copyOk && padOk,
      JSON.stringify(clearances.map((c) => [c.id, Math.round(Math.max(c.scriptBottom, c.imgBottom)), Math.round(c.bandTop), Math.round(c.padBottom)])),
    )

    // --- arc nav: ArrowLeft/ArrowRight move between moments ---
    if (IDS.length >= 3) {
      await page.focus(`.timeline-nav__markers a[href="#${IDS[1]}"]`)
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(1600)
      const fwd = await page.evaluate(() => ({
        hash: window.location.hash,
        active: document.querySelector('.timeline-nav__markers a.is-active .timeline-nav__name')?.textContent?.trim(),
        focused: document.activeElement?.getAttribute('href'),
      }))
      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(1600)
      const back = await page.evaluate(() => ({
        hash: window.location.hash,
        active: document.querySelector('.timeline-nav__markers a.is-active .timeline-nav__name')?.textContent?.trim(),
      }))
      check(
        'arc nav: ArrowRight/ArrowLeft travel between moments',
        fwd.hash === `#${IDS[2]}` && fwd.active === M[2].label && fwd.focused === `#${IDS[2]}` && back.hash === `#${IDS[1]}` && back.active === M[1].label,
        JSON.stringify({ fwd, back }),
      )

      // Home/End: jump straight to dawn / dusk from any focused stop
      await page.focus(`.timeline-nav__markers a[href="#${IDS[1]}"]`)
      await page.keyboard.press('End')
      await page.waitForTimeout(1600)
      const endState = await page.evaluate(() => ({
        hash: window.location.hash,
        active: document.querySelector('.timeline-nav__markers a.is-active .timeline-nav__name')?.textContent?.trim(),
        focused: document.activeElement?.getAttribute('href'),
      }))
      await page.keyboard.press('Home')
      await page.waitForTimeout(1600)
      const homeState = await page.evaluate(() => ({
        hash: window.location.hash,
        active: document.querySelector('.timeline-nav__markers a.is-active .timeline-nav__name')?.textContent?.trim(),
        focused: document.activeElement?.getAttribute('href'),
      }))
      check(
        'nav: Home/End travel to the first/last moment',
        endState.hash === `#${IDS[IDS.length - 1]}` &&
          endState.active === M[M.length - 1].label &&
          endState.focused === `#${IDS[IDS.length - 1]}` &&
          homeState.hash === `#${IDS[0]}` &&
          homeState.active === M[0].label &&
          homeState.focused === `#${IDS[0]}`,
        JSON.stringify({ endState, homeState }),
      )
    }

    // --- nav: progress + sun follow in-section scroll continuously ---
    // FI: a section index that always has a next neighbour (2–8 moments safe)
    const FI = Math.min(2, IDS.length - 2)
    if (NAV_VARIANT === 'arc') {
      const followState = await page.evaluate(async (args) => {
        const [idList, fi] = args
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
        const progress = document.querySelector('.timeline-nav__progress')
        const sun = document.querySelector('.timeline-nav__sun')
        const total = parseFloat(progress.getAttribute('stroke-dasharray'))
        const tops = idList.map((id) => document.getElementById(id).getBoundingClientRect().top + window.scrollY)
        const markerXs = [...document.querySelectorAll('.timeline-nav__markers li')].map((li) => parseFloat(li.style.left))
        document.getElementById(idList[fi])?.scrollIntoView({ behavior: 'instant', block: 'start' })
        await sleep(700)
        const docked = parseFloat(getComputedStyle(progress).strokeDashoffset || progress.style.strokeDashoffset)
        const mid = tops[fi] + (tops[fi + 1] - tops[fi]) * 0.5
        window.scrollTo({ top: mid, behavior: 'instant' })
        await sleep(700)
        const midOffset = parseFloat(getComputedStyle(progress).strokeDashoffset || progress.style.strokeDashoffset)
        return { total, docked, midOffset, sunCx: parseFloat(sun.getAttribute('cx')), markerXs, i: fi }
      }, [IDS, FI])
      const n = IDS.length
      const lenAt = (i) => (followState.total * i) / (n - 1)
      const dockedOk = Math.abs(followState.docked - (followState.total - lenAt(FI))) < followState.total * 0.01
      const expectMid = followState.total - (lenAt(FI) + lenAt(FI + 1)) / 2
      const midOk = Math.abs(followState.midOffset - expectMid) < followState.total * 0.03
      const sunOk = followState.sunCx > followState.markerXs[FI] && followState.sunCx < followState.markerXs[FI + 1]
      check('arc nav: progress + sun follow in-section scroll', dockedOk && midOk && sunOk, JSON.stringify(followState))
    } else {
      const followState = await page.evaluate(async (args) => {
        const [idList, fi] = args
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
        const sun = document.querySelector('.timeline-nav__sun')
        const inner = document.querySelector('.sundial-dock__inner')
        const innerLeft = inner.getBoundingClientRect().left
        const stopX = (i) => {
          const d = document.querySelectorAll('.timeline-nav__markers .timeline-nav__dot')[i].getBoundingClientRect()
          return d.left + d.width / 2 - innerLeft
        }
        const tops = idList.map((id) => document.getElementById(id).getBoundingClientRect().top + window.scrollY)
        document.getElementById(idList[fi])?.scrollIntoView({ behavior: 'instant', block: 'start' })
        await sleep(700)
        const docked = parseFloat(sun.style.left)
        const wantDocked = stopX(fi)
        const mid = tops[fi] + (tops[fi + 1] - tops[fi]) * 0.5
        window.scrollTo({ top: mid, behavior: 'instant' })
        await sleep(700)
        return { docked, wantDocked, midPct: parseFloat(sun.style.left), wantMid: (stopX(fi) + stopX(fi + 1)) / 2 }
      }, [IDS, FI])
      const ok = Math.abs(followState.docked - followState.wantDocked) < 1 && Math.abs(followState.midPct - followState.wantMid) < 1.5
      check('dock nav: sun follows in-section scroll along the rail (measured stop centres)', ok, JSON.stringify(followState))

      // --- dock: the sun rides a shallow day-arc (low at dawn/dusk, high at midday) ---
      const arcState = await page.evaluate(async (idList) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
        const sun = document.querySelector('.timeline-nav__sun')
        document.getElementById(idList[0])?.scrollIntoView({ behavior: 'instant', block: 'start' })
        await sleep(700)
        const dawnTop = parseFloat(sun.style.top)
        const mid = idList[Math.floor(idList.length / 2)]
        document.getElementById(mid)?.scrollIntoView({ behavior: 'instant', block: 'start' })
        await sleep(700)
        return { dawnTop, noonTop: parseFloat(sun.style.top) }
      }, IDS)
      check('dock nav: sun arcs over the day (noon rides higher than dawn)', arcState.noonTop < arcState.dawnTop - 1, JSON.stringify(arcState))
    }

    // --- dock geometry precision: the sun's centre and the fill's right edge
    // coincide with each stop's centre (≤1px) at every width, via scroll /
    // click / keyboard paths alike; reduced-motion rests use the same stops ---
    if (NAV_VARIANT === 'dock') {
      const probeDock = (pg) =>
        pg.evaluate(() => {
          const r2 = (v) => Math.round(v * 100) / 100
          const dots = {}
          document.querySelectorAll('.timeline-nav__markers a').forEach((a) => {
            const d = a.querySelector('.timeline-nav__dot').getBoundingClientRect()
            dots[a.getAttribute('href').slice(1)] = r2(d.left + d.width / 2)
          })
          const sun = document.querySelector('.sundial-dock__sun').getBoundingClientRect()
          const fill = document.querySelector('.sundial-dock__fill').getBoundingClientRect()
          return { dots, sunCx: r2(sun.left + sun.width / 2), fillRight: r2(fill.right) }
        })
      for (const [w, h] of [[1440, 900], [1024, 800], [768, 800], [390, 844]]) {
        const gp = await browser.newPage({ viewport: { width: w, height: h } })
        await gp.goto(BASE + '/', { waitUntil: 'networkidle' })
        await gp.waitForTimeout(1300)
        const rows = []
        // path 1: instant scroll jumps onto every stop
        for (const id of IDS) {
          await gp.evaluate((mid) => document.getElementById(mid)?.scrollIntoView({ behavior: 'instant', block: 'start' }), id)
          await gp.waitForTimeout(1250)
          const m = await probeDock(gp)
          rows.push({ id, via: 'scroll', dSun: m.sunCx - m.dots[id], dFill: m.fillRight - m.dots[id] })
        }
        // path 2: pointer click to the last stop
        await gp.evaluate((mid) => document.getElementById(mid)?.scrollIntoView({ behavior: 'instant', block: 'start' }), IDS[0])
        await gp.waitForTimeout(1100)
        await gp.click(`.timeline-nav__markers a[href="#${IDS[IDS.length - 1]}"]`)
        await gp.waitForTimeout(1900)
        {
          const m = await probeDock(gp)
          const id = IDS[IDS.length - 1]
          rows.push({ id, via: 'click', dSun: m.sunCx - m.dots[id], dFill: m.fillRight - m.dots[id] })
        }
        // path 3: keyboard Home back to the first stop
        await gp.focus(`.timeline-nav__markers a[href="#${IDS[IDS.length - 1]}"]`)
        await gp.keyboard.press('Home')
        await gp.waitForTimeout(1900)
        {
          const m = await probeDock(gp)
          const id = IDS[0]
          rows.push({ id, via: 'Home', dSun: m.sunCx - m.dots[id], dFill: m.fillRight - m.dots[id] })
        }
        const worst = rows.reduce((a, r) => Math.max(a, Math.abs(r.dSun), Math.abs(r.dFill)), 0)
        check(
          `dock geometry: sun centre + fill edge track stop centres ≤1px @${w}px`,
          worst <= 1,
          JSON.stringify(rows.map((r) => [r.id, r.via, Math.round(r.dSun * 100) / 100, Math.round(r.dFill * 100) / 100])),
        )
        await gp.close()
      }
      // reduced motion: the sun rests exactly on the active stop (same measured centres)
      {
        const rmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
        const rmPage = await rmCtx.newPage()
        await rmPage.goto(BASE + '/', { waitUntil: 'networkidle' })
        await rmPage.waitForTimeout(1300)
        const rows = []
        for (const id of IDS) {
          await rmPage.evaluate((mid) => document.getElementById(mid)?.scrollIntoView({ behavior: 'instant', block: 'start' }), id)
          await rmPage.waitForTimeout(800)
          const m = await probeDock(rmPage)
          rows.push([id, Math.round((m.sunCx - m.dots[id]) * 100) / 100, Math.round((m.fillRight - m.dots[id]) * 100) / 100])
        }
        const worst = rows.reduce((a, r) => Math.max(a, Math.abs(r[1]), Math.abs(r[2])), 0)
        check('dock geometry: reduced-motion rest stops use the same measured centres ≤1px', worst <= 1, JSON.stringify(rows))
        await rmCtx.close()
      }

      // --- fill clamp: the day-line never runs past the last hour ring, even
      // when the sunset carries the sun to the dock's edge (four widths) ---
      for (const [w, h] of [[1440, 900], [1024, 800], [768, 800], [390, 844]]) {
        const cp = await browser.newPage({ viewport: { width: w, height: h } })
        await cp.goto(BASE + '/', { waitUntil: 'networkidle' })
        await cp.waitForTimeout(1300)
        await cp.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
        await cp.waitForTimeout(1300)
        const m = await cp.evaluate(() => {
          const r2 = (v) => Math.round(v * 100) / 100
          const dots = [...document.querySelectorAll('.timeline-nav__markers .timeline-nav__dot')]
          const lastDot = dots[dots.length - 1].getBoundingClientRect()
          const fill = document.querySelector('.sundial-dock__fill').getBoundingClientRect()
          const sun = document.querySelector('.sundial-dock__sun').getBoundingClientRect()
          return { lastDotCx: r2(lastDot.left + lastDot.width / 2), fillRight: r2(fill.right), sunCx: r2(sun.left + sun.width / 2) }
        })
        check(
          `dock geometry: fill edge clamped to the last stop at page end @${w}px`,
          m.fillRight <= m.lastDotCx + 0.5,
          JSON.stringify(m),
        )
        await cp.close()
      }
    }

    // --- title fit ("量体裁衣"): single line when it fits with breathing room,
    // width-balanced lines when it must wrap ---
    {
      await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }), IDS[0])
      await page.waitForTimeout(1400)
      const fitState = await page.evaluate(() =>
        [...document.querySelectorAll('.moment__title')].map((t) => {
          const r = t.getBoundingClientRect()
          return { id: t.closest('.moment')?.id, fit: t.dataset.fit ?? 'unset', w: r.width, left: r.left, right: innerWidth - r.right, vw: innerWidth }
        }),
      )
      const allFitted = fitState.every((t) => t.fit === 'single' || t.fit === 'balanced')
      const singles = fitState.filter((t) => t.fit === 'single')
      const marginsOk = singles.every((t) => t.left >= 78 && t.right >= 78)
      check(
        'title fit: single-line titles keep ≥ ~80px breathing room per side @1440',
        allFitted && singles.length >= 1 && marginsOk,
        JSON.stringify(fitState.map((t) => [t.id, t.fit, Math.round(t.w), Math.round(t.left), Math.round(t.right)])),
      )
    }
    {
      // balanced wrapping: the ritual title at 390 wraps into ≥2 lines whose
      // widths match the DP optimum (canvas-measured, spread within ±2px)
      const tp = await browser.newPage({ viewport: { width: 390, height: 844 } })
      await tp.goto(BASE + '/', { waitUntil: 'networkidle' })
      await tp.waitForTimeout(1600)
      const balanced = await tp.evaluate((rid) => {
        const t = document.querySelector(`#${rid} .moment__title`)
        const lines = [...t.querySelectorAll('.moment__title-line')]
        // canvas text metric (block line spans stretch to the h2 width, so
        // rects can't read the true text width — measure the strings instead)
        const cs = getComputedStyle(t)
        const ctx = document.createElement('canvas').getContext('2d')
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        const fontSize = parseFloat(cs.fontSize) || 16
        const lsRaw = cs.letterSpacing.trim()
        const ls = lsRaw.endsWith('em') ? parseFloat(lsRaw) * fontSize : parseFloat(lsRaw) || 0
        const mw = (s) => ctx.measureText(cs.textTransform === 'uppercase' ? s.toUpperCase() : s).width + ls * s.length
        const widths = lines.map((l) => mw(l.textContent ?? ''))
        const words = (t.querySelector('.sr-only')?.textContent ?? t.textContent).trim().split(/\s+/)
        const spaceW = mw(' ')
        const wordW = words.map(mw)
        const lineW = (i, j) => wordW.slice(i, j).reduce((a, b) => a + b, 0) + spaceW * (j - i - 1)
        let best = Infinity
        for (let j = 1; j < words.length; j++) best = Math.min(best, Math.abs(lineW(0, j) - lineW(j, words.length)))
        return {
          fit: t.dataset.fit ?? 'unset',
          n: lines.length,
          texts: lines.map((l) => l.textContent),
          widths: widths.map((w) => Math.round(w * 10) / 10),
          boxW: t.getBoundingClientRect().width,
          spread: Math.max(...widths) - Math.min(...widths),
          optSpread: best,
          maxWidth: Math.min(innerWidth - 56, 1280),
        }
      }, RITUAL_ID)
      check(
        'title fit: wrapped ritual title balances lines to the DP optimum @390',
        balanced.fit === 'balanced' &&
          balanced.n >= 2 &&
          balanced.boxW <= balanced.maxWidth + 2 &&
          Math.abs(balanced.spread - balanced.optSpread) <= 2,
        JSON.stringify(balanced),
      )
      await tp.close()
    }

    // --- collage: frag hour-notes render for every captioned frag ---
    const notesCount = await page.evaluate(() => {
      const out = {}
      for (const s of document.querySelectorAll('.moment--collage')) {
        out[s.id] = s.querySelectorAll('.moment__caption--note').length
      }
      return out
    })
    const fragNotesOk = M.filter((m) => m.layout === 'collage').every(
      (m) => notesCount[m.id] === m.images.filter((i) => i.slot === 'frag' && i.caption).length,
    )
    check('layout collage: frag hour-notes match config captions', fragNotesOk, JSON.stringify(notesCount))

    // --- nav: sunset at day's end (last marker sinks / dock sun sinks + dims) ---
    const sunsetBase = await page.evaluate(() => document.querySelector('.timeline-nav').style.getPropertyValue('--sunset') || '0')
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
    await page.waitForTimeout(900)
    const sunset = await page.evaluate(() => ({
      t: parseFloat(document.querySelector('.timeline-nav').style.getPropertyValue('--sunset') || '0'),
      progressOpacity: parseFloat(getComputedStyle(document.querySelector('.timeline-nav__progress')).opacity),
      lastTransform: getComputedStyle(document.querySelector('.timeline-nav__markers li:last-child')).transform,
      sunTransform: getComputedStyle(document.querySelector('.timeline-nav__sun')).transform,
      sunOpacity: parseFloat(getComputedStyle(document.querySelector('.timeline-nav__sun')).opacity),
    }))
    const sunsetOk =
      NAV_VARIANT === 'arc'
        ? parseFloat(sunsetBase) === 0 && sunset.t > 0.5 && sunset.progressOpacity < 0.5 && sunset.lastTransform !== 'none'
        : parseFloat(sunsetBase) === 0 && sunset.t > 0.5 && sunset.progressOpacity < 0.6 && sunset.sunTransform !== 'none' && sunset.sunOpacity < 0.6
    check(`${NAV_VARIANT} nav: sunset sinks the sun + dims the chrome`, sunsetOk, JSON.stringify({ base: sunsetBase, ...sunset }))

    // --- footer small-links row clears the bottom chrome (page fully scrolled) ---
    const footerClear = await page.evaluate((args) => {
      const [variant, arcRiseVw] = args
      const row = document.querySelector('.site-footer__bottom').getBoundingClientRect()
      const navH = document.querySelector('.timeline-nav').getBoundingClientRect().height
      const rise = Math.max(10, Math.min(navH - 30, (arcRiseVw / 100) * innerWidth))
      const chromeTop = variant === 'arc' ? innerHeight - (14 + rise) : innerHeight - navH
      return { rowBottom: row.bottom, rowTop: row.top, chromeTop, vh: innerHeight }
    }, [NAV_VARIANT, siteConfig.nav?.arcRiseVw ?? 8])
    check(
      'footer links row clears the bottom chrome',
      footerClear.rowBottom <= footerClear.chromeTop - 4,
      JSON.stringify(footerClear),
    )
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }), LAST.id)
    await page.waitForTimeout(900)

    // --- socials: config-driven entries (chip / poem / handles / marks) ---
    const socialMode = siteConfig.socialStyle ?? 'chip'
    const socials = await page.evaluate(() => {
      const edge = document.querySelector('.social-edge')
      return {
        chip: !!document.querySelector('.social-chip'),
        poem: !!document.querySelector('.social-poem'),
        headerChipLinks: [...document.querySelectorAll('.site-header .social-chip__link')].map((a) => a.getAttribute('aria-label') ?? ''),
        headerRow: !!document.querySelector('.site-header .social-row'),
        rowLinks: [...document.querySelectorAll('.site-header .social-row .social-link')].map((a) => a.getAttribute('aria-label') ?? ''),
        markLinks: [...document.querySelectorAll('.site-header .social-link--mark')].map((a) => a.getAttribute('aria-label') ?? ''),
        handleEntries: [...document.querySelectorAll('.site-header .social-link--handle')].map((a) => ({
          site: a.querySelector('.social-link__site')?.textContent?.trim() ?? null,
          handle: a.querySelector('.social-link__handle')?.textContent?.trim() ?? null,
        })),
        edge: !!edge,
        edgeLinks: edge ? [...edge.querySelectorAll('.social-edge__link')].map((a) => a.getAttribute('aria-label') ?? '') : [],
        edgeRect: edge ? (({ top, bottom, right }) => ({ top, bottom, right }))(edge.getBoundingClientRect()) : null,
        vw: innerWidth,
        vh: innerHeight,
      }
    })
    const wantArias = siteConfig.socials.map((s) => `${s.label} ${s.handle ?? ''}`.trim())
    let socialsOk = false
    if (siteConfig.socials.length === 0) {
      // default-clean sample: nothing renders anywhere (no edge ribbon, no
      // header cell content, no footer chip/poem shell)
      socialsOk =
        !socials.edge &&
        !socials.chip &&
        !socials.poem &&
        socials.headerChipLinks.length === 0 &&
        !socials.headerRow &&
        socials.rowLinks.length === 0 &&
        socials.markLinks.length === 0
    } else if (SOCIAL_PLACEMENT === 'edge') {
      socialsOk =
        socials.edge &&
        socials.headerChipLinks.length === 0 &&
        !socials.headerRow &&
        socials.edgeLinks.length === siteConfig.socials.length &&
        wantArias.every((w, i) => socials.edgeLinks[i] === w) &&
        Math.abs(socials.edgeRect.right - (socials.vw - 18)) <= 6 &&
        socials.edgeRect.top > socials.vh * 0.25 &&
        socials.edgeRect.bottom < socials.vh * 0.75
    } else if (socialMode === 'chip') {
      socialsOk =
        socials.chip && socials.headerChipLinks.length === siteConfig.socials.length && wantArias.every((w, i) => socials.headerChipLinks[i] === w)
    } else if (socialMode === 'poem') {
      socialsOk = socials.poem && wantArias.length === siteConfig.socials.length
    } else if (socialMode === 'marks') {
      socialsOk = socials.markLinks.length === siteConfig.socials.length
    } else {
      socialsOk =
        socials.handleEntries.length === siteConfig.socials.length &&
        siteConfig.socials.every((s, i) => socials.handleEntries[i].site === s.label && socials.handleEntries[i].handle === s.handle)
    }
    check(
      `socials: entries per config (placement=${SOCIAL_PLACEMENT}, style=${socialMode})`,
      socialsOk,
      JSON.stringify({ placement: SOCIAL_PLACEMENT, mode: socialMode, ...socials }),
    )

    // config-level custom marks: every social with iconSvg renders an inline svg
    // with real vector content in the shared currentColor stroke frame.
    const customMarks = await page.evaluate(() => {
      const CUSTOM_SEL = '.social-edge__link, .social-chip__link, .social-poem__link, .social-link--mark'
      return [...document.querySelectorAll(CUSTOM_SEL)].map((a) => {
        const svg = a.querySelector('svg')
        return {
          label: a.getAttribute('aria-label') ?? '',
          hasSvg: !!svg,
          vectorCount: svg ? svg.querySelectorAll('path, circle, rect').length : 0,
          stroke: svg ? getComputedStyle(svg).stroke : null,
        }
      })
    })
    const iconSvgSocials = siteConfig.socials.filter((s) => (s.iconSvg ?? '').trim())
    const customOk = iconSvgSocials.every((s) => {
      const aria = `${s.label} ${s.handle ?? ''}`.trim()
      const m = customMarks.find((x) => x.label === aria)
      return m && m.hasSvg && m.vectorCount >= 1 && m.stroke !== 'none' && m.stroke !== ''
    })
    check(
      `socials: iconSvg custom marks render inline svg with currentColor stroke (n=${iconSvgSocials.length})`,
      iconSvgSocials.length === 0 || customOk,
      JSON.stringify(customMarks),
    )

    if (SOCIAL_PLACEMENT === 'edge' && siteConfig.socials.length > 0) {
      // right-edge poem tag: handles pop out to the left with a stagger
      const edgeRest = await page.evaluate(() => getComputedStyle(document.querySelector('.social-edge__handle')).opacity)
      await page.hover('.social-edge')
      await page.waitForTimeout(700)
      const edgeOpen = await page.evaluate(() => ({
        opacity: getComputedStyle(document.querySelector('.social-edge__handle')).opacity,
        transform: getComputedStyle(document.querySelector('.social-edge__handle')).transform,
      }))
      await page.mouse.move(720, 450)
      await page.waitForTimeout(700)
      const edgeClosed = await page.evaluate(() => getComputedStyle(document.querySelector('.social-edge__handle')).opacity)
      check(
        'socials: edge tag pops handle chips on hover + collapses on leave',
        edgeRest === '0' && edgeOpen.opacity === '1' && edgeOpen.transform !== 'none' && edgeClosed === '0',
        JSON.stringify({ edgeRest, edgeOpen, edgeClosed }),
      )
    }
    if (SOCIAL_PLACEMENT === 'header' && socialMode === 'chip' && siteConfig.socials.length > 0) {
      // collapsed at rest → expands on hover (width grows, letters type in) → collapses on leave
      const rest = await page.evaluate(() => ({
        maxWidth: getComputedStyle(document.querySelector('.social-chip__handle')).maxWidth,
        chOpacity: getComputedStyle(document.querySelector('.social-chip__ch')).opacity,
      }))
      await page.hover('.social-chip')
      await page.waitForTimeout(900)
      const open = await page.evaluate(() => ({
        maxWidth: getComputedStyle(document.querySelector('.social-chip__handle')).maxWidth,
        chOpacity: getComputedStyle(document.querySelector('.social-chip__ch')).opacity,
      }))
      await page.mouse.move(720, 450)
      await page.waitForTimeout(800)
      const closed = await page.evaluate(() => getComputedStyle(document.querySelector('.social-chip__handle')).maxWidth)
      check(
        'socials: chip expands on hover (letters type in) + collapses on leave',
        rest.maxWidth === '0px' && rest.chOpacity === '0' && open.maxWidth === '132px' && open.chOpacity === '1' && closed === '0px',
        JSON.stringify({ rest, open, closed }),
      )
    }
    if (SOCIAL_PLACEMENT === 'header' && socialMode === 'handles') {
      await page.hover('.site-header .social-link--handle')
      await page.waitForTimeout(500)
      const lineTransform = await page.evaluate(() => getComputedStyle(document.querySelector('.social-link__line')).transform)
      check('socials: hover draws the 1px underline', lineTransform !== 'none' && !lineTransform.includes('matrix(0,'), lineTransform)
      await page.mouse.move(720, 450)
    }

    // --- dock labels: real pixel contrast ≥ 4.5 on a light and a dark moment ---
    const dockContrastAt = async (id) => {
      await page.evaluate((mid) => document.getElementById(mid)?.scrollIntoView({ behavior: 'instant', block: 'start' }), id)
      await page.waitForTimeout(1100)
      const shot = await page.screenshot()
      return page.evaluate(async (b64) => {
        const img = new Image()
        img.src = 'data:image/png;base64,' + b64
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const idle = [...document.querySelectorAll('.timeline-nav__markers a')].find((a) => !a.classList.contains('is-active'))
        const r = idle.querySelector('.timeline-nav__label').getBoundingClientRect()
        const lin = (v) => {
          const s = v / 255
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        }
        const lumAt = (x, y) => {
          const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data
          return 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2])
        }
        const bg = []
        for (let x = r.left - 8; x <= r.right + 8; x += 3) {
          bg.push(lumAt(x, r.top - 5))
          bg.push(lumAt(x, r.bottom + 5))
        }
        for (let y = r.top; y <= r.bottom; y += 3) {
          bg.push(lumAt(r.left - 7, y))
          bg.push(lumAt(r.right + 7, y))
        }
        bg.sort((a, b) => a - b)
        const bgL = bg[Math.floor(bg.length / 2)]
        const inner = []
        for (let y = r.top + 1; y < r.bottom - 1; y += 2) {
          for (let x = r.left + 1; x < r.right - 1; x += 2) inner.push(lumAt(x, y))
        }
        inner.sort((a, b) => Math.abs(a - bgL) - Math.abs(b - bgL))
        const glyph = inner.slice(Math.floor(inner.length * 0.85))
        const glyphL = glyph.reduce((s, v) => s + v, 0) / glyph.length
        const hi = Math.max(bgL, glyphL)
        const lo = Math.min(bgL, glyphL)
        return { ratio: (hi + 0.05) / (lo + 0.05), bgL: Math.round(bgL * 1000) / 1000 }
      }, shot.toString('base64'))
    }
    if (NAV_VARIANT === 'dock' && DOCK_LABELS) {
      const cLight = await dockContrastAt(IDS[MID])
      const cDark = await dockContrastAt(IDS[IDS.length - 1])
      check(
        'dock nav: idle labels keep real contrast ≥ 4.5 (light + dark moments)',
        cLight.ratio >= 4.5 && cDark.ratio >= 4.5,
        JSON.stringify({ light: cLight, dark: cDark }),
      )
    }

    // --- fx layer: dust / magnet / develop / pulse / drift / glow ---
    const fxRoot = await page.evaluate(() => ['dust', 'magnet', 'develop', 'pulse', 'drift', 'glow'].map((k) => document.documentElement.classList.contains(`fx-${k}`)))
    const fxWant = ['dust', 'magnet', 'develop', 'pulse', 'drift', 'glow'].map((k) => siteConfig.fx?.[k] !== false)
    check('fx: per-effect root classes match config', fxRoot.every((v, i) => v === fxWant[i]), JSON.stringify(fxRoot))

    const dust = await page.evaluate(async (id) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const all = [...document.querySelectorAll('.dust-canvas')]
      const before = all.filter((c) => c.dataset.running === '1').length
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
      await sleep(800)
      const active = document.querySelector(`#${id} .dust-canvas`)?.dataset.running ?? 'missing'
      return { total: all.length, runningBefore: before, activeAfterDock: active }
    }, IDS[MID])
    check(
      'fx: dust canvas per section, animates only in view',
      dust.total === M.length && dust.activeAfterDock === '1' && dust.runningBefore <= 1,
      JSON.stringify(dust),
    )

    // --- "时尘" per-moment particle families: each section's canvas carries
    // the configured kind, distinct kinds paint visibly different frames, and
    // the field fades across the blend zones (no hard cut at the seams) ---
    const families = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const canvases = [...document.querySelectorAll('.dust-canvas')]
      const kinds = canvases.map((c) => c.dataset.kind ?? 'missing')
      const masks = canvases.map((c) => {
        const cs = getComputedStyle(c)
        return cs.maskImage || cs.webkitMaskImage || 'none'
      })
      // let two differently-kinded sections animate, then compare their frames
      const pick = [...document.querySelectorAll('.moment')].map((s) => s.id)
      const caps = {}
      for (const id of pick) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
        await sleep(900)
        const c = document.querySelector(`#${id} .dust-canvas`)
        caps[id] = c ? c.toDataURL() : ''
      }
      return { kinds, masks, caps }
    })
    const wantKinds = M.map((m) => m.particles?.kind ?? 'dust')
    const kindsOk = families.kinds.every((k, i) => k === wantKinds[i])
    // frames must differ between any two sections whose kinds differ
    let framesDiffer = true
    for (let i = 0; i < wantKinds.length && framesDiffer; i++) {
      for (let j = i + 1; j < wantKinds.length && framesDiffer; j++) {
        if (wantKinds[i] !== wantKinds[j] && families.caps[M[i].id] === families.caps[M[j].id]) framesDiffer = false
      }
    }
    check('fx: per-moment particle families match config + distinct kinds paint distinct frames', kindsOk && framesDiffer, JSON.stringify({ kinds: families.kinds, wantKinds }))
    // blend-zone cross-fade: non-first sections fade the field in from the top,
    // non-last fade it out at the bottom (first/last keep one clean edge)
    const blendZone = siteConfig.blend?.zoneVh ?? 26
    // Chrome normalizes the default `180deg` away and serializes `transparent`
    // as rgba(0,0,0,0) — match the computed forms of both fade directions.
    const hasTopFade = (mk) => mk.startsWith('linear-gradient(rgba(0, 0, 0, 0) 0px') || mk.includes('linear-gradient(180deg')
    const hasBottomFade = (mk) => mk.includes('calc(100%') || mk.includes('linear-gradient(0deg')
    const masksOk =
      blendZone > 0
        ? families.masks.every((mk, i) => (i > 0 ? hasTopFade(mk) : true) && (i < M.length - 1 ? hasBottomFade(mk) : true))
        : families.masks.every((mk) => mk === 'none' || mk === '')
    check('fx: particle fields cross-fade inside the blend zones (masked seams)', masksOk, JSON.stringify(families.masks.map((mk) => mk.slice(0, 42))))

    // magnetic CTA: follows the cursor ±px, springs back on leave
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }), IDS[0])
    await page.waitForTimeout(1100)
    const ctaBox = await page.locator('.moment__cta').first().boundingBox()
    let magnet = { moved: 'skip', back: 'skip' }
    if (ctaBox) {
      await page.mouse.move(ctaBox.x + ctaBox.width / 2, ctaBox.y + ctaBox.height / 2)
      await page.mouse.move(ctaBox.x + ctaBox.width / 2 + 12, ctaBox.y + ctaBox.height / 2 + 6, { steps: 4 })
      await page.waitForTimeout(250)
      const moved = await page.evaluate(() => getComputedStyle(document.querySelector('.moment__cta')).transform)
      await page.mouse.move(720, 300)
      await page.waitForTimeout(900)
      const back = await page.evaluate(() => getComputedStyle(document.querySelector('.moment__cta')).transform)
      magnet = { moved, back }
    }
    check('fx: magnetic CTA follows cursor + springs back', magnet.moved !== 'none' && magnet.moved !== 'skip' && magnet.back === 'none', JSON.stringify(magnet))

    // title develop: unrevealed titles carry blur(8px), revealed end-state is sharp
    // (fresh page: the main flow has already revealed every section)
    {
      const devPage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await devPage.goto(BASE + '/', { waitUntil: 'networkidle' })
      await devPage.waitForTimeout(900)
      const pre = await devPage.evaluate((id) => getComputedStyle(document.querySelector(`#${id} .moment__title`)).filter, IDS[Math.min(3, N - 1)])
      await devPage.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }), IDS[Math.min(3, N - 1)])
      await devPage.waitForTimeout(1400)
      const post = await devPage.evaluate((id) => getComputedStyle(document.querySelector(`#${id} .moment__title`)).filter, IDS[Math.min(3, N - 1)])
      await devPage.close()
      check('fx: title develop blur(8px) → sharp end-state', pre.includes('blur') && post === 'none', JSON.stringify({ pre, post }))
    }

    // sun pulse trail: stepping through the day drops fading motes on the arc
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      for (let y = 0; y <= 1200; y += 150) {
        window.scrollTo({ top: y, behavior: 'instant' })
        await sleep(90)
      }
    })
    const pulses = await page.evaluate(() => document.querySelectorAll('.timeline-nav__pulse').length)
    check('fx: sun traveller drops a pulse trail', pulses >= 1, `pulses=${pulses}`)

    // frag drift: collage fragments animate independently after reveal
    if (COLLAGE_I >= 0) {
      await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }), M[COLLAGE_I].id)
      await page.waitForTimeout(1600)
    }
    const drift = await page.evaluate(() => {
      const frag = document.querySelector('.moment__img--frag-0')
      return frag ? getComputedStyle(frag).animationName : null
    })
    check('fx: collage fragments drift independently', COLLAGE_I < 0 || drift !== 'none', `animation=${drift}`)

    // cursor glow: appears and follows on desktop pointer
    await page.mouse.move(500, 400)
    await page.mouse.move(700, 430, { steps: 6 })
    await page.waitForTimeout(700)
    const glow = await page.evaluate(() => ({
      opacity: getComputedStyle(document.querySelector('.cursor-glow')).opacity,
      transform: getComputedStyle(document.querySelector('.cursor-glow')).transform,
    }))
    check('fx: cursor glow follows pointer (theme-tinted)', glow.opacity === '1' && glow.transform !== 'none', JSON.stringify(glow))

    // --- polish: no visible seam around the ritual copy block ---
    // (a) the copy block carries no background geometry at all (root cause);
    // (b) ring-vs-far sanity: 8px-outside ring vs 90px further out, excluding
    // horizon (downward) and header-veil (top) rays so only local罩 edges
    // could trip it. (Whole dawn group runs only when a ritual moment exists.)
    if (DAWN_ON) {
      await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }), RITUAL_ID)
      await page.waitForTimeout(1100)
      const bgNone = await page.evaluate((rid) => {
        const cs = getComputedStyle(document.querySelector(`#${rid} .moment__content`))
        return { backgroundImage: cs.backgroundImage, boxShadow: cs.boxShadow }
      }, RITUAL_ID)
      const shot = await page.screenshot()
      const seam = await page.evaluate(async (args) => {
        const [b64, rid] = args
        const img = new Image()
        img.src = 'data:image/png;base64,' + b64
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        // union box of the copy block's children: the fitted title may now be
        // wider than the 640px content column (single-line case) — the seam
        // ring must enclose the actual glyphs, not the column
        const kids = [...document.querySelector(`#${rid} .moment__content`).children].map((k) => k.getBoundingClientRect())
        const el = kids.reduce(
          (u, r) => ({
            left: Math.min(u.left, r.left),
            right: Math.max(u.right, r.right),
            top: Math.min(u.top, r.top),
            bottom: Math.max(u.bottom, r.bottom),
          }),
          { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
        )
        el.width = el.right - el.left
        el.height = el.bottom - el.top
        const cx = el.left + el.width / 2
        const cy = el.top + el.height / 2
        const rx = el.width / 2 + 8
        const ry = el.height / 2 + 8
        const deltas = []
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * Math.PI * 2
          const ca = Math.cos(a)
          const sa = Math.sin(a)
          if (sa > 0.35) continue // horizon zone below
          const near = { x: Math.round(cx + ca * rx), y: Math.round(cy + sa * ry) }
          const far = { x: Math.round(cx + ca * (rx + 90)), y: Math.round(cy + sa * (ry + 90)) }
          if (far.x < 0 || far.x >= c.width || far.y < 140 || far.y >= c.height) continue
          const p1 = ctx.getImageData(Math.max(0, near.x), Math.max(0, near.y), 1, 1).data
          const p2 = ctx.getImageData(far.x, far.y, 1, 1).data
          deltas.push(Math.max(Math.abs(p1[0] - p2[0]), Math.abs(p1[1] - p2[1]), Math.abs(p1[2] - p2[2])))
        }
        deltas.sort((a, b) => a - b)
        return { median: deltas[Math.floor(deltas.length / 2)], max: deltas[deltas.length - 1], n: deltas.length }
      }, [shot.toString('base64'), RITUAL_ID])
      check(
        'polish: no visible seam around the ritual copy block (no geometry + ring sanity)',
        bgNone.backgroundImage === 'none' && bgNone.boxShadow === 'none' && seam.median < 16 && seam.max < 40,
        JSON.stringify({ ...seam, ...bgNone }),
      )
    }

    // --- dawn horizon: gold band low over the scene, rises + swells on scroll ---
    // Phase-robust metric: interleave rest/mid pairs (breath lands on both
    // positions equally), then per pair compare the SAME rows across the two
    // positions — the row the band rises INTO is scene-only at rest, so
    // rows_mid[bandRow] − rows_rest[bandRow] isolates the swelled band from
    // breathing light blobs (which would otherwise contaminate max-row sampling).
    // (guarded: the whole dawn group needs a ritual moment hosting the shader)
    if (DAWN_ON) {
    const horizonOnce = async () => {
      const du = await page.evaluate((rid) => document.querySelector(`#${rid} .dawn-bg`).toDataURL(), RITUAL_ID)
      return page.evaluate(async (du2) => {
        const img = new Image()
        img.src = du2
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const rows = []
        for (let gy = 0; gy < 20; gy++) {
          let warm = 0
          for (let gx = 0; gx < 6; gx++) {
            const d = ctx.getImageData(Math.round(((gx + 0.5) / 6) * c.width), Math.round(((gy + 0.5) / 20) * c.height), 1, 1).data
            warm += d[0] - d[2]
          }
          rows.push(warm / 6)
        }
        return rows
      }, du)
    }
    const hzBase = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + window.scrollY, RITUAL_ID)
    const argmaxOf = (rows) => rows.indexOf(Math.max(...rows))
    const medianOf = (vals) => {
      const s = [...vals].sort((a, b) => a - b)
      return s[Math.floor(s.length / 2)]
    }
    // interleaved rest/mid pairs: the ~8s breath lands on both positions
    // equally, and per-pair same-row comparison isolates the band
    const hzPairs = []
    for (let k = 0; k < 5; k++) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), hzBase)
      await page.waitForTimeout(800)
      const top = await horizonOnce()
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), hzBase + 450)
      await page.waitForTimeout(800)
      const mid = await horizonOnce()
      const restRow = argmaxOf(top)
      const bandRow = argmaxOf(mid)
      hzPairs.push({
        restRow,
        bandRow,
        presence: top[restRow] - medianOf(top),
        arrival: mid[bandRow] - top[bandRow],
        // band-region mass growth: the swelled band pours into its new
        // neighbourhood (peak-vs-peak comparison is breath-saturation noise)
        mass: [bandRow - 1, bandRow, bandRow + 1].filter((r) => r >= 0 && r <= 19).reduce((s, r) => s + (mid[r] - top[r]), 0),
      })
    }
    const hzPresence = medianOf(hzPairs.map((p) => p.presence))
    const hzArrival = medianOf(hzPairs.map((p) => p.arrival))
    const hzMass = medianOf(hzPairs.map((p) => p.mass))
    const hzRises = hzPairs.filter((p) => p.bandRow < p.restRow).length
    check(
      'dawn horizon: gold band present + rises and swells with scroll',
      hzPresence > 5 && hzRises >= 4 && hzArrival > 5 && hzMass > 8,
      JSON.stringify({ hzPresence, hzArrival, hzMass, hzRises, pairs: hzPairs }),
    )

    // --- dawn breath: light level oscillates on the 7–11s cycle ---
    {
      await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }), RITUAL_ID)
      await page.waitForTimeout(800)
      const series = []
      for (let i = 0; i < 10; i++) {
        series.push(
          await page.evaluate((rid) => {
            const canvas = document.querySelector(`#${rid} .dawn-bg`)
            const c = document.createElement('canvas')
            c.width = 64
            c.height = 64
            const ctx = c.getContext('2d')
            ctx.drawImage(canvas, 0, Math.round(canvas.height * 0.25), Math.round(canvas.width * 0.3), Math.round(canvas.height * 0.3), 0, 0, 64, 64)
            const d = ctx.getImageData(0, 0, 64, 64).data
            let sum = 0
            for (let k = 0; k < d.length; k += 4) sum += d[k] * 0.3 + d[k + 1] * 0.55 + d[k + 2] * 0.15
            return sum / (d.length / 4)
          }, RITUAL_ID),
        )
        await page.waitForTimeout(700)
      }
      let signs = 0
      let prev = 0
      let min = Infinity
      let max = -Infinity
      for (let i = 1; i < series.length; i++) {
        const d = series[i] - series[i - 1]
        min = Math.min(min, series[i])
        max = Math.max(max, series[i])
        if (Math.abs(d) > 0.15 && Math.sign(d) !== prev && prev !== 0) signs++
        if (Math.abs(d) > 0.15) prev = Math.sign(d)
      }
      check('dawn breath: light level oscillates (7–11s cycle)', max - min >= 2 && signs >= 1, `range=${(max - min).toFixed(2)} signs=${signs}`)
    }

    // --- interactive ripples: pointer press raises ring waves; multiple superpose ---
    {
      await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }), RITUAL_ID)
      await page.waitForTimeout(1200)
      const cap = () => page.evaluate((rid) => document.querySelector(`#${rid} .dawn-bg`).toDataURL(), RITUAL_ID)
      const regionDelta = async (a, b, sx, sy, frontUv) =>
        page.evaluate(async (args) => {
          const [a64, b64, px, py, front] = args
          const decode = async (du) => {
            const img = new Image()
            img.src = du
            await img.decode()
            const c = document.createElement('canvas')
            c.width = img.naturalWidth
            c.height = img.naturalHeight
            const ctx = c.getContext('2d')
            ctx.drawImage(img, 0, 0)
            return { w: c.width, h: c.height, ctx }
          }
          const A = await decode(a64)
          const B = await decode(b64)
          const cx = px * A.w
          const cy = py * A.h
          const rad = front * A.h
          let maxD = 0
          let moved = 0
          let n = 0
          for (let i = 0; i < 40; i++) {
            const ang = (i / 40) * Math.PI * 2
            for (const rr of [0.75, 1, 1.3]) {
              const x = Math.round(cx + Math.cos(ang) * rad * rr)
              const y = Math.round(cy + Math.sin(ang) * rad * rr)
              if (x < 0 || y < 0 || x >= A.w || y >= B.h) continue
              const p1 = A.ctx.getImageData(x, y, 1, 1).data
              const p2 = B.ctx.getImageData(x, y, 1, 1).data
              const d = Math.max(Math.abs(p1[0] - p2[0]), Math.abs(p1[1] - p2[1]), Math.abs(p1[2] - p2[2]))
              if (d > maxD) maxD = d
              if (d > 8) moved++
              n++
            }
          }
          return { maxD, moved, n }
        }, [a, b, sx, sy, frontUv])

      const rip0 = await cap()
      // click outside the copy calm zone (ripple gain is masked near the copy
      // block) so the ring front reads at full strength on any palette
      const ripSpot = await page.evaluate((rid) => {
        const sec = document.getElementById(rid).getBoundingClientRect()
        const content = document.querySelector(`#${rid} .moment__content`).getBoundingClientRect()
        return {
          x: Math.min(sec.right - 60, content.right + 120),
          y: Math.min(sec.bottom - 60, content.bottom + 90),
          w: sec.width,
          h: sec.height,
        }
      }, RITUAL_ID)
      await page.mouse.click(ripSpot.x, ripSpot.y)
      await page.waitForTimeout(480)
      const rip1 = await cap()
      const d1 = await regionDelta(rip0, rip1, ripSpot.x / ripSpot.w, ripSpot.y / ripSpot.h, 0.16)
      check('ripple: pointer press raises a ring wave (refraction + gold rim)', d1.maxD >= 8 && d1.moved >= 3, JSON.stringify(d1))

      // second press elsewhere: both wavefronts alive → superposition
      await page.mouse.click(460, 300)
      await page.waitForTimeout(420)
      const rip2 = await cap()
      const d2a = await regionDelta(rip0, rip2, 0.5, 0.53, 0.30)
      const d2b = await regionDelta(rip0, rip2, 0.32, 0.33, 0.14)
      check(
        'ripple: multiple ring waves superpose naturally',
        d2a.moved >= 3 && d2b.moved >= 3,
        JSON.stringify({ first: d2a, second: d2b }),
      )

      // bounded cost: analytic model declared + median frame gap stays under 33ms
      const ripMeta = await page.evaluate(async (rid) => {
        const gaps = await new Promise((res) => {
          const out = []
          let last = performance.now()
          const loop = () => {
            const now = performance.now()
            out.push(now - last)
            last = now
            if (out.length < 40) window.requestAnimationFrame(loop)
            else res(out)
          }
          window.requestAnimationFrame(loop)
        })
        gaps.sort((a, b) => a - b)
        return { model: document.querySelector(`#${rid} .dawn-bg`).dataset.ripple, medianGap: gaps[Math.floor(gaps.length / 2)] }
      }, RITUAL_ID)
      check(
        'ripple: analytic wavefield, bounded cost (median frame ≤ 34ms)',
        ripMeta.model === 'analytic cap-12' && ripMeta.medianGap <= 34,
        JSON.stringify(ripMeta),
      )
    }

    // --- dawn shader backdrop (ritual) + night stars (nightfall) ---
    const decodeSamples = async (dataUrl) =>
      page.evaluate(async (du) => {
        const img = new Image()
        img.src = du
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const pts = []
        for (let gy = 0; gy < 25; gy++) {
          for (let gx = 0; gx < 40; gx++) {
            const x = Math.round(((gx + 0.5) / 40) * (c.width - 1))
            const y = Math.round(((gy + 0.5) / 25) * (c.height - 1))
            pts.push([...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)])
          }
        }
        return pts
      }, dataUrl)

    const dawnPresence = await page.evaluate(
      (args) => {
        const [rid, nid] = args
        return {
          dawn: rid ? !!document.querySelector(`#${rid} .dawn-bg[data-variant="dawn"]`) : null,
          stars: nid ? !!document.querySelector(`#${nid} .dawn-bg[data-variant="stars"]`) : null,
        }
      },
      [RITUAL_ID, NIGHTFALL_ID],
    )
    check(
      'dawn: shader canvas in ritual + stars variant in nightfall',
      (RITUAL_ID === null || dawnPresence.dawn === true) && (NIGHTFALL_ID === null || dawnPresence.stars === true),
      JSON.stringify(dawnPresence),
    )

    // flowing: two captures 2.5s apart must visibly differ
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }), RITUAL_ID)
    await page.waitForTimeout(1200)
    const cap1 = await page.evaluate((rid) => document.querySelector(`#${rid} .dawn-bg`).toDataURL(), RITUAL_ID)
    await page.waitForTimeout(2500)
    const cap2 = await page.evaluate((rid) => document.querySelector(`#${rid} .dawn-bg`).toDataURL(), RITUAL_ID)
    const [s1, s2] = [await decodeSamples(cap1), await decodeSamples(cap2)]
    let moved = 0
    let maxDelta = 0
    for (let i = 0; i < s1.length; i++) {
      const d = Math.max(Math.abs(s1[i][0] - s2[i][0]), Math.abs(s1[i][1] - s2[i][1]), Math.abs(s1[i][2] - s2[i][2]))
      if (d > 3) moved++
      if (d > maxDelta) maxDelta = d
    }
    check('dawn: shader frames flow (captures differ over time)', maxDelta >= 8 && moved >= 2, `maxDelta=${maxDelta} moved=${moved}/${s1.length}`)

    // readability: median luminance behind the title keeps WCAG contrast vs ink
    const lum = await page.evaluate((rid) => {
      const canvas = document.querySelector(`#${rid} .dawn-bg`)
      const sec = document.getElementById(rid).getBoundingClientRect()
      const title = document.querySelector(`#${rid} .moment__title`).getBoundingClientRect()
      const c = document.createElement('canvas')
      c.width = canvas.width
      c.height = canvas.height
      const ctx = c.getContext('2d')
      ctx.drawImage(canvas, 0, 0)
      const vals = []
      for (let gy = 0; gy < 6; gy++) {
        for (let gx = 0; gx < 10; gx++) {
          const cx = title.left + ((gx + 0.5) / 10) * title.width - sec.left
          const cy = title.top + ((gy + 0.5) / 6) * title.height - sec.top
          const d = ctx.getImageData(Math.round((cx / sec.width) * c.width), Math.round((cy / sec.height) * c.height), 1, 1).data
          const lin = (v) => {
            const s = v / 255
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
          }
          vals.push(0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]))
        }
      }
      vals.sort((a, b) => a - b)
      return vals[Math.floor(vals.length / 2)]
    }, RITUAL_ID)
    const inkLum = (() => {
      const { r, g, b } = hexToRgb(EFF[RITUAL_I].ink)
      const lin = (v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    })()
    const ratio = (Math.max(lum, inkLum) + 0.05) / (Math.min(lum, inkLum) + 0.05)
    check('dawn: copy area stays readable (WCAG contrast ≥ 4.5)', ratio >= 4.5, `ratio=${ratio.toFixed(2)} bgL=${lum.toFixed(3)}`)

    // first-light mood: luminous-dark scene + cream copy + registered layers
    const mood = await page.evaluate((rid) => {
      const canvas = document.querySelector(`#${rid} .dawn-bg`)
      const c = document.createElement('canvas')
      c.width = canvas.width
      c.height = canvas.height
      const ctx = c.getContext('2d')
      ctx.drawImage(canvas, 0, 0)
      const lin = (v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      }
      const vals = []
      for (let gy = 0; gy < 8; gy++) {
        for (let gx = 0; gx < 12; gx++) {
          const d = ctx.getImageData(Math.round(((gx + 0.5) / 12) * c.width), Math.round(((gy + 0.5) / 8) * c.height), 1, 1).data
          vals.push(0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]))
        }
      }
      vals.sort((a, b) => a - b)
      return {
        layers: canvas.dataset.layers ?? '',
        sceneL: vals[Math.floor(vals.length / 2)],
        titleColor: getComputedStyle(document.querySelector(`#${rid} .moment__title`)).color,
      }
    }, RITUAL_ID)
    {
      const parse = (s) => {
        const m = s.match(/\d+/g).map(Number)
        return { r: m[0], g: m[1], b: m[2] }
      }
      const wantInk = hexToRgb(EFF[RITUAL_I].ink)
      const gotInk = parse(mood.titleColor)
      const close = ['r', 'g', 'b'].every((k) => Math.abs(gotInk[k] - wantInk[k]) <= 6)
      const moodOn = (siteConfig.fx?.dawnMood ?? 'first-light') === 'first-light'
      check(
        'dawn mood: first-light luminous-dark scene + derived cream copy + layers',
        !moodOn ||
          (mood.sceneL < 0.2 && close && mood.layers.includes('dark') && mood.layers.includes('sweep') && mood.layers.includes('caustics')),
        JSON.stringify(mood),
      )
    }

    // CSS gradient twin when WebGL is unavailable
    {
      const fbPage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await fbPage.addInitScript(() => {
        const orig = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (String(type).includes('webgl')) return null
          return orig.call(this, type, ...args)
        }
      })
      await fbPage.goto(BASE + '/', { waitUntil: 'networkidle' })
      await fbPage.waitForTimeout(1300)
      const fb = await fbPage.evaluate((rid) => {
        const el = document.querySelector(`#${rid} .dawn-bg--fallback`)
        return el ? { present: true, bg: getComputedStyle(el).backgroundImage.slice(0, 60) } : { present: false, bg: '' }
      }, RITUAL_ID)
      check('dawn: CSS gradient fallback when WebGL unavailable', fb.present && fb.bg.includes('radial-gradient'), JSON.stringify(fb))
      await fbPage.close()
    }
    } // end if (DAWN_ON) — dawn shader group

    // --- transitions: top blend zone bridges every seam (DOM color continuity) ---
    const seamDom = await page.evaluate(() => {
      const rgb = /rgba?\([^)]+\)/g
      const stops = (el) => getComputedStyle(el).backgroundImage.match(rgb) || []
      const secs = [...document.querySelectorAll('.moment')]
      const pairs = []
      for (let i = 1; i < secs.length; i++) {
        const prev = stops(secs[i - 1])
        const blend = secs[i].querySelector('.paper-blend')
        const cur = blend ? stops(blend) : []
        pairs.push({ id: secs[i].id, from: cur[0] ?? null, prevBottom: prev[prev.length - 1] ?? null })
      }
      const fb = document.querySelector('.site-footer__blend')
      const last = stops(secs[secs.length - 1])
      const fbStops = fb ? stops(fb) : []
      return { pairs, footer: fb ? { from: fbStops[0] ?? null, prevBottom: last[last.length - 1] ?? null } : null }
    })
    const seamDomOk =
      seamDom.pairs.every((p) => p.from && p.from === p.prevBottom) && !!seamDom.footer && seamDom.footer.from === seamDom.footer.prevBottom
    check('transitions: blend zone bridges every seam (DOM continuity)', seamDomOk, JSON.stringify(seamDom))

    // --- chrome link: header ink interpolates continuously between moments ---
    const chrome = await page.evaluate(async (midId) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const secs = [...document.querySelectorAll('.moment')]
      const centers = secs.map((s) => s.getBoundingClientRect().top + window.scrollY + s.getBoundingClientRect().height / 2)
      const header = document.querySelector('.site-header')
      window.scrollTo({ top: (centers[0] + centers[1]) / 2 - window.innerHeight / 2, behavior: 'instant' })
      await sleep(700)
      const mid = getComputedStyle(header).color
      document.getElementById(midId)?.scrollIntoView({ behavior: 'instant', block: 'start' })
      await sleep(700)
      const docked = getComputedStyle(header).color
      const varSet = document.documentElement.style.getPropertyValue('--chrome-ink') !== ''
      return { mid, docked, varSet }
    }, IDS[MID])
    {
      const mix = (a, b) => {
        const A = hexToRgb(a)
        const B = hexToRgb(b)
        return { r: (A.r + B.r) / 2, g: (A.g + B.g) / 2, b: (A.b + B.b) / 2 }
      }
      const parse = (s) => {
        const m = s.match(/\d+(\.\d+)?/g).map(Number)
        return { r: m[0], g: m[1], b: m[2] }
      }
      const wantMid = mix(EFF[0].ink, EFF[1].ink)
      const gotMid = parse(chrome.mid)
      const wantDock = hexToRgb(EFF[MID].ink)
      const gotDock = parse(chrome.docked)
      const close = (a, b, tol) => ['r', 'g', 'b'].every((k) => Math.abs(a[k] - b[k]) <= tol)
      check(
        'chrome link: header ink interpolates between moments',
        chrome.varSet && close(gotMid, wantMid, 8) && close(gotDock, wantDock, 3),
        JSON.stringify(chrome),
      )
    }

    // --- transitions: pixel strips across the five junctions show no hard seam ---
    // Edge detector: a horizontal hard seam makes every column jump at the same
    // row. Per row-pair we take the median |delta| across 5 columns (robust to
    // photo texture, grain, and content), then the max over the ±72px band.
    const stripDelta = async (y, selector) => {
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y)
      await page.waitForTimeout(650)
      const boundaryY = await page.evaluate((sel) => document.querySelector(sel).getBoundingClientRect().top, selector)
      const shot = await page.screenshot()
      return page.evaluate(async (args) => {
        const [b64, by] = args
        const img = new Image()
        img.src = 'data:image/png;base64,' + b64
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const xs = [0.2, 0.35, 0.5, 0.65, 0.8].map((f) => Math.round(c.width * f))
        const rows = []
        for (let yy = Math.max(4, Math.round(by - 72)); yy <= Math.min(c.height - 4, Math.round(by + 72)); yy += 12) {
          rows.push(xs.map((x) => [...ctx.getImageData(x, yy, 1, 1).data.slice(0, 3)]))
        }
        let maxMed = 0
        for (let r = 1; r < rows.length; r++) {
          const deltas = xs.map((_, k) =>
            Math.max(
              Math.abs(rows[r][k][0] - rows[r - 1][k][0]),
              Math.abs(rows[r][k][1] - rows[r - 1][k][1]),
              Math.abs(rows[r][k][2] - rows[r - 1][k][2]),
            ),
          )
          deltas.sort((a, b) => a - b)
          maxMed = Math.max(maxMed, deltas[Math.floor(deltas.length / 2)])
        }
        return maxMed
      }, [shot.toString('base64'), boundaryY])
    }
    const seamYs = await page.evaluate(() => {
      const secs = [...document.querySelectorAll('.moment')]
      const vh = window.innerHeight
      const ys = []
      for (let i = 1; i < secs.length; i++) {
        ys.push({ name: `${secs[i - 1].id}--${secs[i].id}`, y: secs[i].getBoundingClientRect().top + window.scrollY - vh * 0.5, sel: `#${secs[i].id}` })
      }
      ys.push({ name: 'dusk--footer', y: document.body.scrollHeight - vh - 160, sel: '.site-footer' })
      return ys
    })
    const deltas = []
    for (const s of seamYs) deltas.push({ name: s.name, delta: await stripDelta(s.y, s.sel) })
    check(
      'transitions: pixel strips show no hard seam (5 junctions)',
      deltas.every((d) => d.delta < 16),
      JSON.stringify(deltas),
    )
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }), LAST.id)
    await page.waitForTimeout(900)

    // --- broken media fallback ---
    await page.evaluate(() => {
      const img = document.querySelector('.moment__img img')
      if (img) {
        img.removeAttribute('srcset')
        img.src = '/media/definitely-missing.jpg'
      }
    })
    await page.waitForTimeout(800)
    check('broken media: fallback rendered', await page.isVisible('.moment__img .img-fallback'))

    // --- newsletter states ---
    await page.fill('#nl-email', 'not-an-email')
    await page.click('.newsletter__form button')
    await page.waitForTimeout(400)
    check('newsletter: invalid email shows error', await page.isVisible('.newsletter__error'))
    await page.fill('#nl-email', 'reader@example.com')
    await page.click('.newsletter__form button')
    await page.waitForTimeout(400)
    check('newsletter: valid email shows success', await page.isVisible('.newsletter__success'))

    // --- keyboard: focus a nav marker, Enter jumps ---
    await page.focus(`.timeline-nav__markers a[href="#${FIRST.id}"]`)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1300)
    const top = await page.evaluate(() => Math.round(window.scrollY))
    check('keyboard: nav Enter jumps to moment', top < 200, `scrollY=${top}`)

    check('desktop: no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))
    await page.close()
  }

  /* ---------- mobile ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check('mobile: no horizontal overflow', overflow <= 0, `overflow=${overflow}px`)
    const socialMobile = await page.evaluate((args) => {
      const [placement, mode, count] = args
      if (count === 0) {
        // default-clean sample: no social entry anywhere on mobile either
        return !document.querySelector('.social-edge') && !document.querySelector('.social-chip') && !document.querySelector('.social-poem')
      }
      if (placement === 'edge') {
        const edge = document.querySelector('.social-edge')
        if (!edge) return false
        const r = edge.getBoundingClientRect()
        const handle = document.querySelector('.social-edge__handle')
        return r.bottom <= innerHeight && r.bottom > innerHeight - 160 && handle ? getComputedStyle(handle).opacity === '0' : false
      }
      if (mode === 'chip') {
        const chip = document.querySelector('.social-chip')
        const handle = document.querySelector('.social-chip__handle')
        return chip && handle ? getComputedStyle(handle).maxWidth === '0px' : false
      }
      const h = document.querySelector('.social-link__handle')
      return h ? getComputedStyle(h).display === 'none' : true
    }, [SOCIAL_PLACEMENT, siteConfig.socialStyle ?? 'chip', siteConfig.socials.length])
    check('mobile: social entry collapsed (edge ribbon above dock / chip / labels / none when empty)', socialMobile)
    const navPos = await page.evaluate((args) => {
      const [want, variant] = args
      const nav = document.querySelector('.timeline-nav')
      const r = nav.getBoundingClientRect()
      const activeLabel = document.querySelector('.timeline-nav__markers a.is-active .timeline-nav__label')
      const idleName = document.querySelector('.timeline-nav__markers a:not(.is-active) .timeline-nav__name')
      const idleShort = document.querySelector('.timeline-nav__markers a:not(.is-active) .sundial-dock__short')
      const inner = document.querySelector('.sundial-dock__inner')
      return {
        gap: Math.abs(window.innerHeight - r.bottom),
        width: Math.round(r.width),
        markers: document.querySelectorAll('.timeline-nav__markers a').length,
        trackLen: document.querySelector('.timeline-nav__track')?.getAttribute('d')?.length ?? 0,
        innerH: inner ? Math.round(inner.getBoundingClientRect().height) : null,
        activeOpacity: activeLabel ? getComputedStyle(activeLabel).opacity : null,
        idleNameDisplay: idleName ? getComputedStyle(idleName.closest('.timeline-nav__label')).display : null,
        idleShortDisplay: idleShort ? getComputedStyle(idleShort).display : null,
        tapH: Math.min(...[...document.querySelectorAll('.timeline-nav__markers a')].map((a) => Math.round(a.getBoundingClientRect().height))),
        tapW: Math.min(...[...document.querySelectorAll('.timeline-nav__markers a')].map((a) => Math.round(a.getBoundingClientRect().width))),
        vw: window.innerWidth,
        want,
        variant,
      }
    }, [M.length, NAV_VARIANT])
    const navOk =
      NAV_VARIANT === 'arc'
        ? navPos.gap <= 2 && navPos.width === navPos.vw && navPos.markers === navPos.want && navPos.trackLen > 0 && navPos.activeOpacity === '1'
        : navPos.gap <= 2 &&
          navPos.width === navPos.vw &&
          navPos.markers === navPos.want &&
          navPos.innerH > 0 &&
          navPos.innerH <= 64 &&
          navPos.activeOpacity === '1' &&
          navPos.idleNameDisplay === 'none' &&
          ['inline-block', 'block'].includes(navPos.idleShortDisplay)
    check(`mobile: ${NAV_VARIANT} spans the viewport bottom (markers + active label, zero overflow)`, navOk, JSON.stringify(navPos))
    check(
      `mobile: ${NAV_VARIANT} touch targets ≥ 44px`,
      NAV_VARIANT === 'arc' ? true : navPos.tapH >= 44 && navPos.tapW >= 44,
      JSON.stringify({ tapH: navPos.tapH, tapW: navPos.tapW }),
    )
    await page.close()
  }

  /* ---------- short viewport (1440×700) ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 700 } })
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    const clear = await page.evaluate(async (args) => {
      const [idList, variant, arcRiseVw] = args
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const out = []
      for (const id of idList) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
        await sleep(620)
        const header = document.querySelector('.site-header').getBoundingClientRect()
        const sec = document.getElementById(id)
        const navH = document.querySelector('.timeline-nav').getBoundingClientRect().height
        const rise = Math.max(10, Math.min(navH - 30, (arcRiseVw / 100) * innerWidth))
        const bandTop = variant === 'arc' ? innerHeight - (14 + rise + 34) : innerHeight - (navH + 20)
        const bottoms = [...sec.querySelectorAll('.moment__script, .moment__title, .moment__body, .moment__cta, .moment__img')]
          .filter((el) => !el.classList.contains('moment__img--bg'))
          .map((el) => el.getBoundingClientRect().bottom)
        out.push({ id, titleTop: sec.querySelector('.moment__title').getBoundingClientRect().top, headerBottom: header.bottom, maxBottom: Math.max(...bottoms), bandTop })
      }
      return out
    }, [IDS, NAV_VARIANT, siteConfig.nav?.arcRiseVw ?? 8])
    const headOk = clear.every((c) => c.titleTop >= c.headerBottom - 1)
    const bandOk = clear.every((c) => c.maxBottom <= c.bandTop)
    check(`short viewport: titles clear header + content clears ${NAV_VARIANT} band`, headOk && bandOk, JSON.stringify(clear.map((c) => [c.id, Math.round(c.maxBottom), Math.round(c.bandTop)])))

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
    await page.waitForTimeout(900)
    const foot = await page.evaluate((args) => {
      const [variant, arcRiseVw] = args
      const row = document.querySelector('.site-footer__bottom').getBoundingClientRect()
      const navH = document.querySelector('.timeline-nav').getBoundingClientRect().height
      const rise = Math.max(10, Math.min(navH - 30, (arcRiseVw / 100) * innerWidth))
      const chromeTop = variant === 'arc' ? innerHeight - (14 + rise) : innerHeight - navH
      return { rowBottom: row.bottom, chromeTop }
    }, [NAV_VARIANT, siteConfig.nav?.arcRiseVw ?? 8])
    check('short viewport: footer links row clears the bottom chrome', foot.rowBottom <= foot.chromeTop - 4, JSON.stringify(foot))
    await page.close()
  }

  /* ---------- reduced motion ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    const rm = await page.evaluate(() => {
      const c = document.querySelector('.moment__content')
      const dot = document.querySelector('.timeline-nav__markers a.is-active .timeline-nav__dot')
      const progress = document.querySelector('.timeline-nav__progress')
      return {
        opacity: c ? getComputedStyle(c).opacity : '0',
        dotAnimation: dot ? getComputedStyle(dot).animationName : null,
        progressTransition: progress ? getComputedStyle(progress).transitionDuration : null,
      }
    })
    check('reduced motion: content visible without reveal animation', rm.opacity === '1', `opacity=${rm.opacity}`)
    check(
      'reduced motion: breathe off + progress jump instant',
      rm.dotAnimation === 'none' && parseFloat(rm.progressTransition) <= 0.011,
      `anim=${rm.dotAnimation} transition=${rm.progressTransition}`,
    )
    // sunset + strip drift stay static under reduced motion
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
    await page.waitForTimeout(900)
    const rmStatic = await page.evaluate(() => {
      const strip = document.querySelector('.moment__strip')
      return {
        sunset: document.querySelector('.timeline-nav').style.getPropertyValue('--sunset') || '0',
        stripAnimation: strip ? getComputedStyle(strip).animationName : 'none',
        progressOpacity: getComputedStyle(document.querySelector('.timeline-nav__progress')).opacity,
      }
    })
    check(
      'reduced motion: sunset static + strip drift off at page end',
      parseFloat(rmStatic.sunset) === 0 && rmStatic.stripAnimation === 'none' && parseFloat(rmStatic.progressOpacity) > 0.9,
      JSON.stringify(rmStatic),
    )
    // chrome link stays off: no --chrome-ink var; header keeps the static per-moment ink
    const rmChrome = await page.evaluate(() => ({
      varSet: document.documentElement.style.getPropertyValue('--chrome-ink') !== '',
      headerColor: getComputedStyle(document.querySelector('.site-header')).color,
    }))
    const wantInk = hexToRgb(LAST.theme.ink)
    const gotInk = (() => {
      const m = rmChrome.headerColor.match(/\d+/g).map(Number)
      return { r: m[0], g: m[1], b: m[2] }
    })()
    check(
      'reduced motion: chrome colors static (no scroll-linked interpolation)',
      !rmChrome.varSet && ['r', 'g', 'b'].every((k) => Math.abs(gotInk[k] - wantInk[k]) <= 2),
      JSON.stringify(rmChrome),
    )
    // fx layer under reduced motion: chip rests expanded, dust never loops,
    // cursor glow stays hidden, titles carry no blur
    const rmFx = await page.evaluate((hasSocials) => {
      const chipHandle = document.querySelector('.social-chip__handle')
      const chipCh = document.querySelector('.social-chip__ch')
      return {
        chipAbsent: !document.querySelector('.social-chip'),
        chipMaxWidth: chipHandle ? getComputedStyle(chipHandle).maxWidth : null,
        chipCh: chipCh ? getComputedStyle(chipCh).opacity : null,
        dustRunning: document.querySelector('.dust-canvas')?.dataset.running ?? 'none',
        glowOpacity: getComputedStyle(document.querySelector('.cursor-glow')).opacity,
        titleFilter: getComputedStyle(document.querySelector('.moment__title')).filter,
      }
    }, siteConfig.socials.length > 0)
    check(
      'reduced motion: chip static-expanded (or absent when no socials) + dust/glow/develop static',
      (siteConfig.socials.length === 0 ? rmFx.chipAbsent : rmFx.chipMaxWidth === '132px' && rmFx.chipCh === '1') &&
        rmFx.dustRunning === 'none' &&
        rmFx.glowOpacity === '0' &&
        rmFx.titleFilter === 'none',
      JSON.stringify(rmFx),
    )
    // dawn shader: one static frame under reduced motion (ripples disabled — a click changes nothing)
    if (DAWN_ON) {
      const rmCap1 = await page.evaluate((rid) => document.querySelector(`#${rid} .dawn-bg`).toDataURL(), RITUAL_ID)
      await page.mouse.click(720, 480)
      await page.waitForTimeout(800)
      const rmCap2 = await page.evaluate((rid) => document.querySelector(`#${rid} .dawn-bg`).toDataURL(), RITUAL_ID)
      const rmRunning = await page.evaluate((rid) => document.querySelector(`#${rid} .dawn-bg`).dataset.running ?? 'none', RITUAL_ID)
      check('reduced motion: dawn static frame + ripples disabled', rmCap1 === rmCap2 && rmRunning === 'none', `identical=${rmCap1 === rmCap2} running=${rmRunning}`)
    }
    await ctx.close()
  }

  await browser.close()
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n== matrix: ${results.length - failed}/${results.length} passed ==`)
  process.exit(failed ? 1 : 0)
})()
