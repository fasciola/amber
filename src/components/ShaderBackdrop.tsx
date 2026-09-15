import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { siteConfig } from '../config'
import { hexToRgb } from '../lib/color'

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

/*
 * "晨光" dawn / night-stars fragment shader.
 * dawn:  slow aurora bands (fbm), two drifting light blobs (cursor-weighted),
 *        micro sparkle, a calm mask around the copy centre, scroll-warmed tint.
 * stars: sparse twinkling points over a slow nebula drift.
 */
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBg;
uniform vec3 uA;
uniform vec3 uB;
uniform float uIntensity;
uniform vec2 uMouse;
uniform float uWarm;
uniform float uVariant;
uniform float uDensity;
uniform float uMood;
uniform float uSweep;
uniform float uCaustics;
uniform float uMeteor;
uniform float uHorizon;
uniform float uHorizonY;
uniform float uHorizonGain;
uniform float uBreath;
uniform float uRipGain;
uniform vec3 uRip[12];

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.3, 9.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;
  vec3 col = uBg;

  if (uVariant < 0.5) {
    /* ---- dawn: flowing morning light ---- */
    /* interactive ripples ("morning water"): analytic ring waves raised by
       pointer/touch — the light field refracts along each wavefront and a
       gold rim rides it. Fixed 12 slots, analytic, bounded cost. */
    vec2 disp = vec2(0.0);
    float rim = 0.0;
    for (int i = 0; i < 12; i++) {
      vec3 R = uRip[i];
      float age = t - R.z;
      if (age > 0.0 && age < 7.0) {
        vec2 rel = p - R.xy;
        float d = max(length(rel), 0.0001);
        float front = age * 0.34;
        float env = exp(-260.0 * (d - front) * (d - front));
        float amp = exp(-age * 0.55) * smoothstep(0.0, 0.15, age);
        float osc = sin((d - front) * 110.0) * env * amp;
        disp += (rel / d) * osc * 0.016;
        rim += env * amp;
      }
    }
    rim = min(rim, 1.2);
    vec2 pw = p + disp * uRipGain;

    /* scroll tide: rolling down the section quickens and swells the light */
    float tide = 0.7 + uWarm * 0.6;
    float tt = t * tide;
    float band = fbm(vec2(pw.x * 1.35 - tt * 0.016, pw.y * 2.1 + tt * 0.011));
    float band2 = fbm(vec2(pw.x * 1.05 + t * 0.009 + 4.7, pw.y * 1.75 - t * 0.013));
    /* two big light blobs in slow orbits, centre of gravity pulled by the cursor */
    vec2 c1 = vec2((0.32 + 0.16 * sin(t * 0.020)) * aspect, 0.62 + 0.12 * cos(t * 0.026));
    vec2 c2 = vec2((0.72 + 0.14 * cos(t * 0.017)) * aspect, 0.34 + 0.13 * sin(t * 0.023));
    vec2 m = vec2(uMouse.x * aspect, uMouse.y);
    c1 = mix(c1, m, 0.22);
    c2 = mix(c2, m, 0.12);
    float g1 = exp(-5.5 * dot(pw - c1, pw - c1));
    float g2 = exp(-6.5 * dot(pw - c2, pw - c2));
    /* keep the copy area calm so text always reads */
    float calm = smoothstep(0.16, 0.60, distance(uv, vec2(0.5, 0.52)) * 1.6);
    float k = uIntensity * calm;

    if (uMood < 0.5) {
      /* 'bright': light colors mixed over the paper base */
      col = mix(col, uA, band * 0.30 * k);
      col = mix(col, uB, band2 * 0.26 * k);
      col += uA * g1 * 0.30 * k;
      col += uB * g2 * 0.26 * k;
      col += uB * rim * 0.30 * uRipGain * k;
      col = mix(col, col * vec3(1.045, 0.99, 0.935), uWarm * 0.6);
      float sp0 = noise(pw * 30.0 + vec2(t * 0.30, -t * 0.22));
      col += vec3(1.0, 0.985, 0.94) * smoothstep(0.955, 1.0, sp0) * 0.10 * k;
    } else {
      /* 'first-light': luminous dark — light added onto the deep base.
         Bands stay a whisper; the drama comes from contained light pools. */
      float g1d = exp(-9.0 * dot(pw - c1, pw - c1));
      float g2d = exp(-11.0 * dot(pw - c2, pw - c2));
      /* light breath: the band swells and rests on an ~8s cycle;
         caustics follow a third of a cycle later */
      float br = uBreath > 0.5 ? (0.74 + 0.26 * sin(t * 0.78 + 1.7)) : 1.0;
      col += uA * band * 0.13 * k * tide * br;
      col += uB * band2 * 0.11 * k * (0.55 + 0.45 * br);
      col += uA * g1d * 0.50 * k * (0.82 + 0.18 * br);
      col += uB * g2d * 0.38 * k;
      /* gold rim riding each ripple wavefront (calm-masked around the copy) */
      col += uB * rim * 0.45 * uRipGain * k;
      /* god-ray sweep: one very slow diagonal band crossing the scene */
      if (uSweep > 0.5) {
        float ang = 0.62 + 0.10 * sin(t * 0.021);
        vec2 dir = vec2(cos(ang), sin(ang));
        float d = dot(p, dir) - t * 0.011;
        float ray = exp(-34.0 * pow(fract(d * 0.30) - 0.5, 2.0));
        col += uB * ray * 0.20 * k * tide;
      }
      /* caustics: small water-light filigree breathing in patches, phase-shifted */
      if (uCaustics > 0.5) {
        float caBr = uBreath > 0.5 ? (0.70 + 0.30 * sin(t * 0.78 + 1.7 + 2.1)) : 1.0;
        float patch = smoothstep(0.55, 0.82, fbm(pw * 0.8 + 3.1));
        float ca = abs(sin(fbm(pw * 3.1 + vec2(t * 0.05, -t * 0.03)) * 6.2831 + t * 0.3));
        ca = pow(1.0 - ca, 7.0);
        col += uA * ca * 0.09 * k * patch * caBr;
      }
      /* horizon band: the first gold line low over the scene bottom,
         rising and swelling as the section scrolls (sun arriving) */
      if (uHorizon > 0.5) {
        float hy = uHorizonY + uWarm * 0.22;
        float hg = exp(-16.0 * pow((uv.y - hy) * 2.4, 2.0));
        float spread = exp(-2.8 * pow((uv.x - 0.5) * 1.7, 2.0));
        col += mix(uB, uA, 0.35) * hg * spread * uHorizonGain * (0.65 + uWarm * 0.7) * k;
      }
      /* dust-in-light micro sparkle, drawn thicker where the gold gathers */
      float dustBias = smoothstep(0.25, 0.75, band2 + g2d * 0.6);
      float sp = noise(pw * 30.0 + vec2(t * 0.30, -t * 0.22));
      col += vec3(1.0, 0.94, 0.80) * smoothstep(0.955, 1.0, sp) * (0.07 + 0.11 * dustBias) * k;
    }
  } else {
    /* ---- stars: sparse night points over a slow nebula ---- */
    float neb = fbm(vec2(p.x * 0.9 + t * 0.006, p.y * 1.3 - t * 0.004));
    col = mix(col, uB, neb * 0.22 * uIntensity);
    vec2 grid = p * 130.0 * uDensity;
    vec2 cell = floor(grid);
    float star = hash(cell);
    float on = step(0.988, star);
    float dot_ = smoothstep(0.16, 0.05, length(fract(grid) - 0.5));
    float tw = 0.35 + 0.65 * (0.5 + 0.5 * sin(t * (0.5 + star * 1.3) + star * 41.0));
    col += uA * on * dot_ * tw * 0.8 * uIntensity;
    /* one slow bright drift (evening star) */
    vec2 c = vec2((0.24 + 0.10 * sin(t * 0.011)) * aspect, 0.72 + 0.06 * cos(t * 0.014));
    col += uA * exp(-160.0 * dot(p - c, p - c)) * 0.5 * uIntensity;
    /* a rare meteor with a fading tail (~22s cycle, ~1.2s flight) */
    if (uMeteor > 0.5) {
      float mt = fract(t * 0.045);
      float flight = clamp(mt / 0.055, 0.0, 1.0);
      float act = step(mt, 0.055);
      float fade = sin(3.14159 * flight) * act;
      vec2 mdir = normalize(vec2(0.82, -0.45));
      vec2 mstart = vec2((0.12 + 0.5 * hash(vec2(floor(t * 0.045), 1.7))) * aspect, 0.86);
      vec2 mpos = mstart + mdir * flight * 0.85;
      vec2 rel = p - mpos;
      float along = dot(rel, mdir);
      float across = abs(dot(rel, vec2(-mdir.y, mdir.x)));
      float tail = exp(-22.0 * across) * (1.0 - smoothstep(-0.34, 0.0, along)) * (1.0 - step(0.02, along));
      float head = exp(-380.0 * dot(rel, rel));
      col += uA * (head * 1.3 + tail * 0.55) * fade * uIntensity;
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`

interface ShaderBackdropProps {
  sectionRef: RefObject<HTMLElement | null>
  /** [background, lightA, lightB] — dawn/stars palette, derived from config themes. */
  colors: [string, string, string]
  variant: 'dawn' | 'stars'
  className?: string
}

/**
 * Small hand-written WebGL shader backdrop. Animates only while its section
 * is in view; renders one static frame under reduced motion; falls back to a
 * CSS gradient twin (`.dawn-bg--fallback`) when WebGL is unavailable.
 */
export function ShaderBackdrop({ sectionRef, colors, variant, className }: ShaderBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const colorKey = colors.join(' ')

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return undefined
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, alpha: false }) as WebGLRenderingContext | null
    if (!gl) {
      setFailed(true)
      return undefined
    }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
      }
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()!
    if (!vs || !fs) {
      setFailed(true)
      return undefined
    }
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true)
      return undefined
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const U = (n: string) => gl.getUniformLocation(prog, n)
    const [bg, A, B] = colors.map((c) => hexToRgb(c))
    const rgb = ({ r, g, b }: { r: number; g: number; b: number }) => [r / 255, g / 255, b / 255]
    gl.uniform3fv(U('uBg'), rgb(bg))
    gl.uniform3fv(U('uA'), rgb(A))
    gl.uniform3fv(U('uB'), rgb(B))
    const fx = siteConfig.fx ?? {}
    const baseIntensity = fx.dawnIntensity ?? 0.85
    const intensity = variant === 'stars' ? baseIntensity * 0.55 : baseIntensity
    const speed = fx.dawnSpeed ?? 1
    const interactive = fx.dawnCursor !== false
    const mood = fx.dawnMood ?? 'first-light'
    gl.uniform1f(U('uIntensity'), intensity)
    gl.uniform1f(U('uVariant'), variant === 'stars' ? 1 : 0)
    gl.uniform1f(U('uMood'), variant === 'dawn' && mood === 'first-light' ? 1 : 0)
    gl.uniform1f(U('uSweep'), fx.sweep !== false ? 1 : 0)
    gl.uniform1f(U('uCaustics'), fx.caustics !== false ? 1 : 0)
    gl.uniform1f(U('uMeteor'), fx.meteor !== false ? 1 : 0)
    gl.uniform1f(U('uHorizon'), fx.horizon !== false ? 1 : 0)
    gl.uniform1f(U('uHorizonY'), fx.horizonY ?? 0.08)
    gl.uniform1f(U('uHorizonGain'), fx.horizonGain ?? 0.55)
    gl.uniform1f(U('uBreath'), fx.breath !== false ? 1 : 0)
    const ripEnabled = fx.ripple !== false && variant === 'dawn'
    gl.uniform1f(U('uRipGain'), ripEnabled ? (fx.rippleGain ?? 0.7) : 0)
    const layers = [variant === 'dawn' && mood === 'first-light' ? 'dark' : 'bright']
    if (variant === 'dawn' && fx.sweep !== false) layers.push('sweep')
    if (variant === 'dawn' && fx.caustics !== false) layers.push('caustics')
    if (variant === 'dawn' && fx.horizon !== false) layers.push('horizon')
    if (ripEnabled) layers.push('ripple')
    if (variant === 'stars' && fx.meteor !== false) layers.push('meteor')
    canvas.dataset.layers = layers.join(' ')
    canvas.dataset.ripple = ripEnabled ? 'analytic cap-12' : 'off'

    let w = 0
    let h = 0
    const resize = () => {
      const rect = section.getBoundingClientRect()
      const dpr = Math.min(window.innerWidth < 760 ? 1 : 1.5, window.devicePixelRatio || 1)
      w = Math.max(1, Math.round(rect.width * dpr))
      h = Math.max(1, Math.round(rect.height * dpr))
      canvas.width = w
      canvas.height = h
      canvas.style.width = `${Math.round(rect.width)}px`
      canvas.style.height = `${Math.round(rect.height)}px`
      gl.viewport(0, 0, w, h)
      gl.uniform2f(U('uRes'), w, h)
      gl.uniform1f(U('uDensity'), window.innerWidth < 760 ? 0.7 : 1)
    }
    resize()

    let mx = 0.5
    let my = 0.45
    let tx = 0.5
    let ty = 0.45
    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect()
      tx = Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width)))
      ty = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / Math.max(1, r.height)))
    }
    if (interactive) window.addEventListener('pointermove', onMove, { passive: true })

    const draw = (tSec: number) => {
      mx += (tx - mx) * 0.04
      my += (ty - my) * 0.04
      gl.uniform2f(U('uMouse'), mx, my)
      const rect = section.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, (window.innerHeight / 2 - rect.top) / Math.max(1, rect.height)))
      gl.uniform1f(U('uWarm'), interactive ? progress : 0.35)
      gl.uniform1f(U('uTime'), tSec * speed)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      /* deterministic stills: dawn rests just before first light; the stars
         frame catches the meteor mid-flight (visible in RM evidence too) */
      draw(variant === 'stars' ? 22.9 : 7.3)
      window.addEventListener('resize', resize)
      return () => {
        window.removeEventListener('resize', resize)
        if (interactive) window.removeEventListener('pointermove', onMove)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }
    }

    let raf = 0
    let running = false
    const t0 = performance.now()

    /* interactive ripples: pointer/touch presses raise analytic ring waves.
       Presses always spawn; drags spawn throttled (120ms / 48px). */
    const RIP_MAX = 12
    const ripData = new Float32Array(RIP_MAX * 3).fill(-1000)
    let ripCount = 0
    let lastSpawn = 0
    let lastSX = -1
    let lastSY = -1
    const spawnRipple = (clientX: number, clientY: number, force: boolean) => {
      const now = performance.now()
      if (!force && now - lastSpawn < 120) return
      const r = section.getBoundingClientRect()
      const x = (clientX - r.left) / Math.max(1, r.width)
      const y = (clientY - r.top) / Math.max(1, r.height)
      if (x < 0 || x > 1 || y < 0 || y > 1) return
      if (!force && lastSX >= 0 && Math.hypot(clientX - lastSX, clientY - lastSY) < 48) return
      lastSpawn = now
      lastSX = clientX
      lastSY = clientY
      const slot = ripCount % RIP_MAX
      ripData[slot * 3] = x * (r.width / r.height)
      ripData[slot * 3 + 1] = 1 - y
      ripData[slot * 3 + 2] = ((now - t0) / 1000) * speed
      ripCount++
      gl.uniform3fv(U('uRip'), ripData)
    }
    const onDown = (e: PointerEvent) => spawnRipple(e.clientX, e.clientY, true)
    const onDrag = (e: PointerEvent) => spawnRipple(e.clientX, e.clientY, false)
    if (ripEnabled) {
      section.addEventListener('pointerdown', onDown, { passive: true })
      window.addEventListener('pointermove', onDrag, { passive: true })
    }

    const loop = (now: number) => {
      draw((now - t0) / 1000)
      raf = running ? window.requestAnimationFrame(loop) : 0
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting
        canvas.dataset.running = running ? '1' : '0'
        if (running && !raf) raf = window.requestAnimationFrame(loop)
      },
      { threshold: 0.04 },
    )
    io.observe(section)
    window.addEventListener('resize', resize)
    return () => {
      io.disconnect()
      window.removeEventListener('resize', resize)
      if (interactive) window.removeEventListener('pointermove', onMove)
      if (ripEnabled) {
        section.removeEventListener('pointerdown', onDown)
        window.removeEventListener('pointermove', onDrag)
      }
      if (raf) window.cancelAnimationFrame(raf)
      delete canvas.dataset.running
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
    // colors are config-stable per variant; re-init only if they genuinely change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionRef, variant, colorKey])

  const cssVars = {
    '--dawn-base': colors[0],
    '--dawn-a': colors[1],
    '--dawn-b': colors[2],
  } as CSSProperties
  if (failed) {
    return <div className={`dawn-bg dawn-bg--fallback dawn-bg--${variant}${className ? ` ${className}` : ''}`} style={cssVars} aria-hidden="true" />
  }
  return <canvas ref={canvasRef} className={`dawn-bg dawn-bg--${variant}${className ? ` ${className}` : ''}`} data-variant={variant} style={cssVars} aria-hidden="true" />
}

export function DawnGate(props: ShaderBackdropProps & { kind: 'dawn' | 'stars' }) {
  const fx = siteConfig.fx ?? {}
  if (props.kind === 'dawn' && fx.dawn === false) return null
  if (props.kind === 'stars' && fx.stars === false) return null
  return <ShaderBackdrop {...props} />
}
