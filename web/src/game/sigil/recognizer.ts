// Compact TypeScript port of the $P Point-Cloud Recognizer
// (Vatavu, Anthony & Wobbrock, ICMI 2012). Dependency-light, MIT-spirit.
// We use it client-side only: a matched sigil sends one rite_invoke event; the
// server (later) never sees raw points (spec §4).

export interface Pt { x: number; y: number; id: number }   // id = stroke index

const NUM_POINTS = 32

export interface Template {
  name: string
  points: Pt[]
}

export interface Match {
  name: string
  score: number   // 0..1, higher is better
}

export class PointCloudRecognizer {
  private templates: Template[] = []

  addTemplate(name: string, points: Pt[]): void {
    this.templates.push({ name, points: normalize(points) })
  }

  recognize(points: Pt[]): Match | null {
    if (points.length < 8 || this.templates.length === 0) return null
    const candidate = normalize(points)
    let best = Infinity
    let bestName = ''
    for (const t of this.templates) {
      const d = this.matchDistance(candidate, t.points)
      if (d < best) { best = d; bestName = t.name }
    }
    return { name: bestName, score: distanceToScore(best) }
  }

  // Score the trace against ONE specific template, ignoring the others. Used so
  // a rite succeeds when the player draws *its* sigil well enough — it doesn't
  // also have to out-resemble every other family's sigil (spec §4: forgiving).
  scoreFor(name: string, points: Pt[]): number | null {
    if (points.length < 8) return null
    const t = this.templates.find(t => t.name === name)
    if (!t) return null
    const candidate = normalize(points)
    return distanceToScore(this.matchDistance(candidate, t.points))
  }

  private matchDistance(candidate: Pt[], template: Pt[]): number {
    return Math.min(
      greedyCloudMatch(candidate, template),
      greedyCloudMatch(template, candidate),
    )
  }
}

// Map a $P cloud distance to a 0..1 score (half-diagonal of unit box ≈ 0.707).
function distanceToScore(d: number): number {
  return Math.max(0, 1 - d / (0.5 * Math.SQRT2))
}

// ---- $P pipeline ----

function normalize(rawPoints: Pt[]): Pt[] {
  const pts = resample(rawPoints, NUM_POINTS)
  scaleToUnit(pts)
  translateToOrigin(pts)
  return pts
}

function resample(points: Pt[], n: number): Pt[] {
  const I = pathLength(points) / (n - 1)
  let D = 0
  const out: Pt[] = [{ ...points[0] }]
  for (let i = 1; i < points.length; i++) {
    if (points[i].id === points[i - 1].id) {
      const d = distance(points[i - 1], points[i])
      if (D + d >= I) {
        const t = (I - D) / d
        const qx = points[i - 1].x + t * (points[i].x - points[i - 1].x)
        const qy = points[i - 1].y + t * (points[i].y - points[i - 1].y)
        const q: Pt = { x: qx, y: qy, id: points[i].id }
        out.push(q)
        points.splice(i, 0, q)
        D = 0
      } else {
        D += d
      }
    }
  }
  while (out.length < n) out.push({ ...points[points.length - 1] })
  return out
}

function greedyCloudMatch(a: Pt[], b: Pt[]): number {
  const n = a.length
  const eps = 0.5
  const step = Math.floor(Math.pow(n, 1 - eps))
  let min = Infinity
  for (let i = 0; i < n; i += step) {
    const d1 = cloudDistance(a, b, i)
    const d2 = cloudDistance(b, a, i)
    min = Math.min(min, d1, d2)
  }
  return min
}

function cloudDistance(a: Pt[], b: Pt[], start: number): number {
  const n = a.length
  const matched = new Array<boolean>(n).fill(false)
  let sum = 0
  let i = start
  do {
    let min = Infinity
    let index = -1
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue
      const d = distance(a[i], b[j])
      if (d < min) { min = d; index = j }
    }
    if (index >= 0) matched[index] = true
    const weight = 1 - ((i - start + n) % n) / n
    sum += weight * min
    i = (i + 1) % n
  } while (i !== start)
  return sum
}

function pathLength(points: Pt[]): number {
  let d = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i].id === points[i - 1].id) d += distance(points[i - 1], points[i])
  }
  return d
}

function scaleToUnit(points: Pt[]): void {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1
  for (const p of points) {
    p.x = (p.x - minX) / size
    p.y = (p.y - minY) / size
  }
}

function translateToOrigin(points: Pt[]): void {
  let cx = 0, cy = 0
  for (const p of points) { cx += p.x; cy += p.y }
  cx /= points.length; cy /= points.length
  for (const p of points) { p.x -= cx; p.y -= cy }
}

function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
