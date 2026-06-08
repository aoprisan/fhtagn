import type { Cell, PatronId } from '../types'
import { haversineKm } from './geo'

// Spread, conversion & the Awakening — the endgame (spec §9, build phase 6).
//
// Kept pure so the rules can be reasoned about and tested in isolation, exactly
// like bargains.ts. The MockGameClient drives state and emits events; this module
// only answers two questions: "may this cell convert that one?" and "how close is
// the world to the stars coming right?". Constants are prototype balance — the
// spec flags tuning as a later pass.

// ---- Spread / conversion (spec §9: cells multiply city→city, convert the uncommitted) ----

export const SPREAD_RANGE_KM = 2500       // how far the word can carry in one spreading
export const OVERPOWER_RATIO = 1.5        // dominate a rival by this much to flip the committed
export const SPREAD_COST_FRACTION = 0.05  // devotion the home cell spends to seed a new one
export const SPREAD_MIN_COST = 500
export const SPREAD_SEED_RETENTION = 0.6  // fraction of the cost that survives the journey
export const LORE_PER_CONVERSION = 2      // forbidden knowledge uncovered by spreading

/** Devotion the home cell spends to carry the word to a new cell. */
export function spreadCost(home: Cell): number {
  return Math.max(SPREAD_MIN_COST, Math.round(home.devotion * SPREAD_COST_FRACTION))
}

export interface ConvertCheck {
  ok: boolean
  reason?: string
  cost?: number
}

/**
 * Whether `home` (serving `patron`) may convert `target`. The uncommitted fall
 * to anyone in range; a rival's cell only flips if you overpower it — or if you
 * serve Hastur, who turns the committed wherever the King in Yellow's madness
 * reaches (spec §6 boon).
 */
export function canConvert(home: Cell, target: Cell, patron: PatronId | null): ConvertCheck {
  if (home.id === target.id) return { ok: false, reason: 'A cell cannot spread into itself.' }
  const dist = haversineKm(home.lat, home.lng, target.lat, target.lng)
  if (dist > SPREAD_RANGE_KM) return { ok: false, reason: `Beyond your reach (${Math.round(dist)}km > ${SPREAD_RANGE_KM}km).` }
  if (target.patronId && patron && target.patronId === patron) {
    return { ok: false, reason: 'Already sworn to your patron.' }
  }
  const cost = spreadCost(home)
  if (home.devotion < cost + 100) return { ok: false, reason: 'Too little devotion to seed a new cell.' }
  if (target.patronId !== null) {
    const isHastur = patron === 'hastur'
    if (!isHastur && home.devotion < target.devotion * OVERPOWER_RATIO) {
      return { ok: false, reason: 'The rival holds too strong — only Hastur turns the committed.' }
    }
  }
  return { ok: true, cost }
}

// ---- The Awakening (spec §9 endgame): the stars come right, the Great Rite wakes a god ----

export const LORE_WEIGHT = 10_000        // each lore counts heavily toward the Great Work
export const REACH_WEIGHT = 15_000       // each cell reached counts most — spread is the path
// The Great Work a cell must amass to perform the Great Rite. Set above the
// strongest seed cell so alignment is climbed through play (chant, spread, lore,
// bargains), not handed out at world start. Prototype balance — tune later (spec §16).
export const GREAT_WORK_GOAL = 1_800_000

/**
 * A cell's progress toward the Great Rite: raw devotion, plus the forbidden lore
 * it has uncovered and the reach of its spread. Spread and lore — not chanting
 * alone — are the road to waking a god, so the endgame rewards the phase-6 verbs.
 */
export function greatWorkScore(c: Cell): number {
  return c.devotion + (c.lore ?? 0) * LORE_WEIGHT + (c.reach ?? 0) * REACH_WEIGHT
}

export interface AlignmentView {
  progress: number     // 0..1 toward the stars coming right
  aligned: boolean     // the stars ARE right — the Great Rite may be performed
  leader: Cell | null  // the cell nearest to waking its god
  goal: number
}

/** How close the whole world is to the Awakening — driven by its foremost cell. */
export function worldAlignment(cells: Cell[]): AlignmentView {
  let leader: Cell | null = null
  let best = 0
  for (const c of cells) {
    const s = greatWorkScore(c)
    if (s > best) { best = s; leader = c }
  }
  return {
    progress: Math.min(1, best / GREAT_WORK_GOAL),
    aligned: best >= GREAT_WORK_GOAL,
    leader,
    goal: GREAT_WORK_GOAL,
  }
}
