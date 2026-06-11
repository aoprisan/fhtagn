import type { PatronMods } from '../types'

// The Liturgy — the cult's growth engine (spec §17, the v2 re-evaluation).
//
// The original loop had no growth curve: a chant was +1 forever, against a world
// of cells holding tens of thousands. This module gives FHTAGN the clicker core
// the genre demands: devotion is SPENDABLE. Followers are generators (devotion
// per second); Litanies are chant multipliers (each doubles the chant). Costs
// climb on the classic exponential curve so every purchase is a real decision
// and the numbers keep going up.
//
// Kept pure, like bargains.ts and awakening.ts, so the economy can be reasoned
// about and tested in isolation. The client owns state and multiplies in the
// patron, tier, and Veil modifiers.

export interface FollowerDef {
  id: string
  name: string
  flavor: string
  baseCost: number
  rate: number       // devotion per second, per follower owned
}

export const FOLLOWERS: FollowerDef[] = [
  {
    id: 'whisperer', name: 'Whisperer', baseCost: 50, rate: 1,
    flavor: 'Mutters the word into doorways and drains.',
  },
  {
    id: 'hollow-choir', name: 'Hollow Choir', baseCost: 420, rate: 6,
    flavor: 'Sings in a key that was never written down.',
  },
  {
    id: 'midnight-shrine', name: 'Midnight Shrine', baseCost: 3_600, rate: 34,
    flavor: 'A back room, a draped table, a thing beneath the cloth.',
  },
  {
    id: 'drowned-temple', name: 'Drowned Temple', baseCost: 26_000, rate: 190,
    flavor: 'The congregation walks in with the tide.',
  },
  {
    id: 'dream-beacon', name: 'Dream-Beacon', baseCost: 170_000, rate: 1_050,
    flavor: 'It calls converts out of their sleep, city by city.',
  },
  {
    id: 'black-library', name: 'Black Library', baseCost: 1_200_000, rate: 6_400,
    flavor: 'Every book is a door. Every reader, a key.',
  },
]

export const FOLLOWER_BY_ID: Record<string, FollowerDef> = Object.fromEntries(
  FOLLOWERS.map(f => [f.id, f]),
)

export interface LitanyDef {
  id: string
  name: string
  cost: number
}

// Each litany learned doubles the chant. Bought in order; six in all.
export const LITANIES: LitanyDef[] = [
  { id: 'salt', name: 'Litany of Salt', cost: 300 },
  { id: 'ash', name: 'Litany of Ash', cost: 3_000 },
  { id: 'teeth', name: 'Litany of Teeth', cost: 30_000 },
  { id: 'the-drowned', name: 'Litany of the Drowned', cost: 300_000 },
  { id: 'the-yellow-sign', name: 'Litany of the Yellow Sign', cost: 3_000_000 },
  { id: 'the-last-door', name: 'Litany of the Last Door', cost: 30_000_000 },
]

export const BASE_COST_GROWTH = 1.15   // per copy owned; Shub-Niggurath pays 1.18

/** Cost of the next copy of a follower, given how many are already owned. */
export function followerCost(def: FollowerDef, owned: number, growth = BASE_COST_GROWTH): number {
  return Math.round(def.baseCost * Math.pow(growth, Math.max(0, owned)))
}

/** Raw devotion/sec from the followers owned, before patron/tier/Veil multipliers. */
export function baseFollowerRate(counts: Record<string, number>): number {
  return FOLLOWERS.reduce((s, f) => s + (counts[f.id] ?? 0) * f.rate, 0)
}

// ---- The Veil (spec §7 rework): madness pays ----
//
// All devotion gain — chant and followers alike — is multiplied by the Veil,
// which thins as sanity falls: ×1.0 fully lucid, ×(1 + slope) unravelled. The
// slope is a patron trait (Hastur's madness pays double). This is the upside
// that makes delving a genuine gamble against the tolls and the Tempter.

export function veilMultiplier(sanity: number, slope: number): number {
  const t = Math.max(0, Math.min(1, (100 - sanity) / 100))
  return 1 + slope * t
}

/** Chant power: 1 base, doubled per litany, then patron/Veil/tier multipliers. Never below 1. */
export function chantPower(litanies: number, mods: PatronMods, veil: number, tierMul: number): number {
  return Math.max(1, Math.round(Math.pow(2, Math.max(0, litanies)) * mods.chantMul * veil * tierMul))
}

/** Devotion/sec after all multipliers. */
export function devotionPerSec(
  counts: Record<string, number>, mods: PatronMods, veil: number, tierMul: number,
): number {
  return baseFollowerRate(counts) * mods.followerMul * veil * tierMul
}

// High Priest (subscription) multipliers: chant ×2 as in the prototype, plus
// the followers labour half again as hard — the pact matters in the idle era too.
export const HIGH_PRIEST_CHANT_MUL = 2
export const HIGH_PRIEST_FOLLOWER_MUL = 1.5

// ---- The Rite of Lucidity: recovery is no longer free ----
//
// v1's free +12 button collapsed the sanity gamble. Clawing back toward Lucid
// now costs a tithe of the cell's devotion, so riding the thin Veil versus
// paying to climb out is an economic decision, not a reflex.

export const LUCIDITY_RESTORE = 15
export const LUCIDITY_TITHE_FRACTION = 0.08
export const LUCIDITY_TITHE_MIN = 50

export function lucidityTithe(devotion: number): number {
  return Math.max(LUCIDITY_TITHE_MIN, Math.round(devotion * LUCIDITY_TITHE_FRACTION))
}

// ---- Soul harvest: rites feed the maw ----
//
// v1 combat gave the caster nothing but a counter, so rational players never
// cast. A rite now returns a fraction of the devotion it tears loose to the
// caster's own cell — offence is an investment, not a sink.

export const SOUL_HARVEST_FRACTION = 0.25
