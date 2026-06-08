import type { Patron, PatronId, RiteFamily } from '../types'

// Patrons (spec §6). Asymmetric flavor; boons are descriptive in v1 (mock sim
// applies light accrual differences; full asymmetry is a later phase).
export const PATRONS: Patron[] = [
  {
    id: 'cthulhu',
    name: 'Cthulhu',
    domain: 'Dreams & the deep — R’lyeh, beneath the Pacific',
    boon: 'Devotion accrues while you sleep',
    drawback: 'Slow to wake; a sluggish early ramp',
    color: '#1f9e8f', // eldritch teal
  },
  {
    id: 'dagon',
    name: 'Dagon',
    domain: 'The oceans and the Deep Ones',
    boon: 'Spreads fastest along coasts and rivers',
    drawback: 'Falters far inland',
    color: '#3b6ea5', // abyssal blue
  },
  {
    id: 'hastur',
    name: 'Hastur',
    domain: 'Madness and decay — the King in Yellow',
    boon: 'Turns rival cultists; strongest as sanity fails',
    drawback: 'Fragile while the mind holds',
    color: '#c9a227', // sickly gold
  },
  {
    id: 'shub-niggurath',
    name: 'Shub-Niggurath',
    domain: 'Proliferation — the Black Goat of the Woods',
    boon: 'Raw multiplication; spawns swarm without end',
    drawback: 'The highest upkeep of all',
    color: '#9c2f3a', // madness crimson
  },
]

export const PATRON_BY_ID: Record<PatronId, Patron> = Object.fromEntries(
  PATRONS.map(p => [p.id, p]),
) as Record<PatronId, Patron>

// Rites (spec §8): 3 families × 3 tiers. Tier sets range + sigil complexity.
export interface RiteDef {
  riteType: string
  family: RiteFamily
  tier: 1 | 2 | 3
  rangeKm: number
  damageLower: number
  damageUpper: number
}

const FAMILY_BANDS: Record<RiteFamily, { lower: number; upper: number }> = {
  whisper: { lower: 300, upper: 700 },
  manifestation: { lower: 3000, upper: 7000 },
  cataclysm: { lower: 30000, upper: 70000 },
}

const TIER_RANGE: Record<1 | 2 | 3, number> = { 1: 500, 2: 1500, 3: 5000 }
const FAMILY_LABEL: Record<RiteFamily, string> = {
  whisper: 'Whisper',
  manifestation: 'Manifestation',
  cataclysm: 'Cataclysm',
}
const TIER_NUMERAL: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' }

function makeRite(family: RiteFamily, tier: 1 | 2 | 3): RiteDef {
  return {
    riteType: `${FAMILY_LABEL[family]} ${TIER_NUMERAL[tier]}`,
    family,
    tier,
    rangeKm: TIER_RANGE[tier],
    damageLower: FAMILY_BANDS[family].lower,
    damageUpper: FAMILY_BANDS[family].upper,
  }
}

export const RITES: RiteDef[] = (['whisper', 'manifestation', 'cataclysm'] as RiteFamily[])
  .flatMap(family => ([1, 2, 3] as (1 | 2 | 3)[]).map(tier => makeRite(family, tier)))

export const RITE_BY_TYPE: Record<string, RiteDef> = Object.fromEntries(
  RITES.map(r => [r.riteType, r]),
)

// Lifetime-devotion thresholds that upgrade the High Priest's standing rite,
// reskinned 1:1 from the prototype's click-missile ladder (spec §8 progression).
export const RITE_THRESHOLDS: { threshold: number; riteType: string }[] = [
  { threshold: 300, riteType: 'Whisper I' },
  { threshold: 2000, riteType: 'Whisper II' },
  { threshold: 4000, riteType: 'Whisper III' },
  { threshold: 6000, riteType: 'Manifestation I' },
  { threshold: 8000, riteType: 'Manifestation II' },
  { threshold: 10000, riteType: 'Manifestation III' },
  { threshold: 13000, riteType: 'Cataclysm I' },
  { threshold: 16000, riteType: 'Cataclysm II' },
  { threshold: 20000, riteType: 'Cataclysm III' },
]

// Revelation rites (Initiate-accessible, granted by revelations) — never the
// top Cataclysm tier (that is High-Priest progression only).
export const REVELATION_RITE_POOL: string[] = [
  'Whisper I', 'Whisper II', 'Whisper III',
  'Manifestation I', 'Manifestation II', 'Manifestation III',
]

export const FAMILY_COLOR: Record<RiteFamily, string> = {
  whisper: '#c9a227',       // sickly gold
  manifestation: '#d4763a', // ember
  cataclysm: '#c9304a',     // madness crimson
}

// Sigil strokes required by tier (spec §4: friction grows with power).
export const TIER_STROKES: Record<1 | 2 | 3, number> = { 1: 1, 2: 2, 3: 3 }
