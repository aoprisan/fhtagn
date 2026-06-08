// FHTAGN — PWA icon generator.
// The mark *is* a sigil: sickly-gold nodes joined by teal light-strokes into a
// seven-pointed star (the stars are right) around a slit-pupil deep-one eye,
// adrift in abyssal void. Mirrors the game's connect-the-dots sigil mechanic.
//
// Emits scalable SVG masters at three detail levels, then a wrapper HTML per
// master so Chrome headless can rasterize the filters/grain faithfully.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PUB = join(HERE, '..', 'public')
const BUILD = join(HERE, '..', '.icon-build')
mkdirSync(PUB, { recursive: true })
mkdirSync(BUILD, { recursive: true })

// — palette (lifted from src/styles/index.css) —
const VOID = '#010307'
const ABYSS_CORE = '#07141d'
const TEAL = '#2bbfa8'
const TEAL_BRIGHT = '#5cf2da'
const TEAL_DIM = '#0e4a43'
const GOLD = '#d8a93a'
const GOLD_BRIGHT = '#f4cf6a'

const C = 256 // centre of a 512 canvas
const TAU = Math.PI * 2
const r2 = (n) => Math.round(n * 100) / 100

// Seven outer vertices, first point at top, traced as a {7/3} unicursal star.
function heptagram(radius) {
  const pts = []
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 7
    pts.push([r2(C + radius * Math.cos(a)), r2(C + radius * Math.sin(a))])
  }
  const order = [0, 3, 6, 2, 5, 1, 4] // step-3 weave, returns to start
  return { pts, order }
}

// One continuous star path through the woven vertex order.
function starPath(pts, order) {
  let d = ''
  order.forEach((idx, k) => {
    d += (k === 0 ? 'M' : 'L') + pts[idx][0] + ' ' + pts[idx][1] + ' '
  })
  return d + 'Z'
}

// The watching eye: a vesica (two mirrored arcs) with slit pupil + gold iris.
function eye(scale) {
  const w = 92 * scale // half-width
  const h = 48 * scale // half-height
  const lid = `M${C - w} ${C} Q${C} ${C - h} ${C + w} ${C} Q${C} ${C + h} ${C - w} ${C} Z`
  const irisR = r2(34 * scale)
  const pupilW = r2(9 * scale)
  const pupilH = r2(30 * scale)
  return { lid, irisR, pupilW, pupilH }
}

function svg({ markScale = 1, detail = 'full', bleed = true }) {
  const R = 150 * markScale
  const { pts, order } = heptagram(R)
  const star = starPath(pts, order)
  const innerR = R * 0.46
  const { pts: ip, order: io } = heptagram(innerR)
  const innerStar = starPath(ip, io)
  const e = eye(markScale)
  const ringR = r2(R * 1.28)
  const nodeR = r2(7.5 * markScale)

  const ticks =
    detail === 'full'
      ? Array.from({ length: 28 }, (_, i) => {
          const a = (i * TAU) / 28
          const r1 = ringR + 7
          const r0 = ringR + (i % 4 === 0 ? 16 : 11)
          return `<line x1="${r2(C + r1 * Math.cos(a))}" y1="${r2(C + r1 * Math.sin(a))}" x2="${r2(
            C + r0 * Math.cos(a)
          )}" y2="${r2(C + r0 * Math.sin(a))}" stroke="${
            i % 4 === 0 ? GOLD : TEAL_DIM
          }" stroke-width="${i % 4 === 0 ? 2.4 : 1.4}" stroke-linecap="round" opacity="${
            i % 4 === 0 ? 0.85 : 0.5
          }"/>`
        }).join('')
      : ''

  const nodes = pts
    .map(
      ([x, y]) => `
      <circle cx="${x}" cy="${y}" r="${r2(nodeR * 2.4)}" fill="${GOLD}" opacity="0.16" filter="url(#soft)"/>
      <circle cx="${x}" cy="${y}" r="${nodeR}" fill="url(#node)" stroke="${GOLD_BRIGHT}" stroke-width="1.2"/>
      <circle cx="${x}" cy="${y}" r="${r2(nodeR * 0.4)}" fill="#fff6df"/>`
    )
    .join('')

  const grain =
    detail === 'full'
      ? `<rect width="512" height="512" filter="url(#grain)" opacity="0.05"/>`
      : ''

  const bg = bleed
    ? `<rect width="512" height="512" fill="url(#field)"/>
       <rect width="512" height="512" fill="url(#vignette)"/>`
    : `<rect x="40" y="40" width="432" height="432" rx="96" fill="url(#field)"/>
       <rect x="40" y="40" width="432" height="432" rx="96" fill="url(#vignette)"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="field" cx="50%" cy="44%" r="72%">
      <stop offset="0%" stop-color="${ABYSS_CORE}"/>
      <stop offset="55%" stop-color="#030810"/>
      <stop offset="100%" stop-color="${VOID}"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="60%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </radialGradient>
    <radialGradient id="node" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${GOLD_BRIGHT}"/>
      <stop offset="100%" stop-color="${GOLD}"/>
    </radialGradient>
    <radialGradient id="iris" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stop-color="${TEAL_BRIGHT}"/>
      <stop offset="45%" stop-color="${TEAL}"/>
      <stop offset="100%" stop-color="${TEAL_DIM}"/>
    </radialGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${TEAL_BRIGHT}"/>
      <stop offset="100%" stop-color="${TEAL}"/>
    </linearGradient>
    <filter id="bloom" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="soft" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/></filter>
  </defs>

  ${bg}

  <!-- ritual boundary -->
  <circle cx="${C}" cy="${C}" r="${ringR}" fill="none" stroke="${TEAL_DIM}" stroke-width="2.2" opacity="0.7"/>
  <circle cx="${C}" cy="${C}" r="${r2(ringR - 7)}" fill="none" stroke="${TEAL}" stroke-width="1" opacity="0.32"/>
  ${ticks}

  <!-- the woven sigil -->
  <g filter="url(#bloom)">
    <path d="${star}" fill="none" stroke="url(#stroke)" stroke-width="${r2(
      4 * markScale
    )}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${innerStar}" fill="none" stroke="${TEAL}" stroke-width="${r2(
      1.8 * markScale
    )}" stroke-linejoin="round" opacity="0.5"/>
  </g>

  <!-- the eye that watches the deep -->
  <g filter="url(#bloom)">
    <path d="${e.lid}" fill="${VOID}" stroke="url(#stroke)" stroke-width="${r2(3.4 * markScale)}"/>
    <circle cx="${C}" cy="${C}" r="${e.irisR}" fill="url(#iris)"/>
    <ellipse cx="${C}" cy="${C}" rx="${e.pupilW}" ry="${e.pupilH}" fill="${VOID}"/>
    <ellipse cx="${r2(C - e.pupilW * 0.5)}" cy="${r2(C - e.pupilH * 0.4)}" rx="${r2(
    e.pupilW * 0.5
  )}" ry="${r2(e.pupilH * 0.28)}" fill="${TEAL_BRIGHT}" opacity="0.6"/>
    <circle cx="${C}" cy="${C}" r="${e.irisR}" fill="none" stroke="${GOLD}" stroke-width="1.6" opacity="0.8"/>
  </g>

  ${nodes}
  ${grain}
</svg>`
}

function wrap(svgStr) {
  // Fixed 512² on sentinel magenta so the capture can be trimmed to the exact
  // icon square regardless of the browser's device-pixel-ratio.
  return `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#ff00ff}
  svg{display:block;width:512px;height:512px}</style>${svgStr}`
}

const masters = {
  icon: svg({ markScale: 0.92, detail: 'full', bleed: true }),
  maskable: svg({ markScale: 0.66, detail: 'simple', bleed: true }),
  favicon: svg({ markScale: 1.02, detail: 'simple', bleed: true }),
}

// Scalable SVG masters shipped as-is (favicon.svg is used directly by browsers).
writeFileSync(join(PUB, 'icon.svg'), masters.icon)
writeFileSync(join(PUB, 'favicon.svg'), masters.favicon)

// Render wrappers for the rasterizer.
for (const [k, s] of Object.entries(masters)) {
  writeFileSync(join(BUILD, `${k}.html`), wrap(s))
}

console.log('wrote icon.svg, favicon.svg + render wrappers')
