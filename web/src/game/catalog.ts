import type { Patron, PatronId, PatronMods, RiteFamily } from '../types'

// Patrons (spec §6, reworked in the v2 re-evaluation). Patron choice was pure
// flavor in v1; each patron now plays a distinct game, expressed entirely
// through `mods` so the rules live in one place:
//   Cthulhu — the idle patron: followers earn more, your own voice carries less.
//   Dagon — the expansion patron: the word travels far and cheap, followers toil slower.
//   Hastur — the risk patron: madness pays double and the committed can be turned,
//            but the mind mends at half pace.
//   Shub-Niggurath — the rush patron: chants and followers surge, costs climb faster.

const BASE_MODS: PatronMods = {
  chantMul: 1, followerMul: 1, spreadRangeMul: 1, spreadCostMul: 1,
  madnessSlope: 1.5, sanityRestoreMul: 1, flipsCommitted: false, followerCostGrowth: 1.15,
}

/** Mods for the unsworn (and any cell without a patron). */
export const DEFAULT_MODS: PatronMods = BASE_MODS

export const PATRONS: Patron[] = [
  {
    id: 'cthulhu',
    name: 'Cthulhu',
    domain: 'Dreams & the deep — R’lyeh, beneath the Pacific',
    boon: 'Followers labour in dream: +50% follower devotion',
    drawback: 'Your own chant carries faintly: −25%',
    color: '#1f9e8f', // eldritch teal
    mods: { ...BASE_MODS, chantMul: 0.75, followerMul: 1.5 },
  },
  {
    id: 'dagon',
    name: 'Dagon',
    domain: 'The oceans and the Deep Ones',
    boon: 'The word swims far: spread 60% further, at half the cost',
    drawback: 'Followers toil slower far from the deep: −10%',
    color: '#3b6ea5', // abyssal blue
    mods: { ...BASE_MODS, followerMul: 0.9, spreadRangeMul: 1.6, spreadCostMul: 0.5 },
  },
  {
    id: 'hastur',
    name: 'Hastur',
    domain: 'Madness and decay — the King in Yellow',
    boon: 'Turns even the committed; madness pays double',
    drawback: 'The mind mends at half pace',
    color: '#c9a227', // sickly gold
    mods: { ...BASE_MODS, madnessSlope: 3, sanityRestoreMul: 0.5, flipsCommitted: true },
  },
  {
    id: 'shub-niggurath',
    name: 'Shub-Niggurath',
    domain: 'Proliferation — the Black Goat of the Woods',
    boon: 'A thousand young: chants +50%, followers +20%',
    drawback: 'The brood hungers — follower costs climb faster',
    color: '#9c2f3a', // madness crimson
    mods: { ...BASE_MODS, chantMul: 1.5, followerMul: 1.2, followerCostGrowth: 1.18 },
  },
]

/** The mods a cultist plays under — DEFAULT_MODS until sworn to a patron. */
export function patronMods(patronId: PatronId | null | undefined): PatronMods {
  return patronId ? PATRON_BY_ID[patronId].mods : DEFAULT_MODS
}

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
