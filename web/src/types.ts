// FHTAGN domain types. The UI-first build has no backend to match, so we adopt
// the correct cult-horror names now; the future Go backend is written to this contract.

export type PatronId = 'cthulhu' | 'dagon' | 'hastur' | 'shub-niggurath'

export interface Patron {
  id: PatronId
  name: string
  domain: string
  boon: string
  drawback: string
  color: string
}

/** A cult cell rooted in a real city. Was "City" in the prototype. */
export interface Cell {
  id: string
  name: string
  country: string
  countryCode: string
  lat: number
  lng: number
  devotion: number          // was totalClicks
  peakDevotion: number      // was highestEverPopulation
  claimed: number           // devotion lost to rites/indifference (was totalDead)
  contributorCount: number
  riteStockpile: number     // was missileStockpile
  patronId: PatronId | null
}

export interface CellDetail extends Cell {
  topContributors: Contributor[]
  dailyChangePercent: number
}

export interface Contributor {
  name: string
  devotion: number          // was totalClicks
}

export type Tier = 'witness' | 'initiate' | 'highPriest'

/** The local player. Was "User". */
export interface Cultist {
  id: string
  name: string
  cellId: string
  patronId: PatronId | null
  sanity: number            // [0,100], 100 = Lucid, 0 = Unravelled
  totalChants: number       // was totalClicks
  tier: Tier                // was role (spectator/builder/warrior)
  souls: number             // devotion claimed from rivals (was totalKills)
  best10s: number
  best1day: number
  riteProgress: number      // was clickMissileClicks
  lastRevelationThreshold: number  // was lastCumulativeThreshold
  todayChants?: number
}

export type RiteFamily = 'whisper' | 'manifestation' | 'cataclysm'

/** An eldritch power invoked by tracing a sigil. Was "Missile". */
export interface Rite {
  id: string
  cultistId: string
  riteType: string          // e.g. "Whisper II", "Cataclysm III"
  family: RiteFamily
  tier: 1 | 2 | 3           // sets range + sigil complexity
  source: string            // 'revelation' | 'chant'
  rangeKm: number
  damageLower: number
  damageUpper: number
  invoked: boolean
  invokedAt?: string
  targetCellId?: string
  devotionClaimed: number
}

export interface Pact {
  id: string
  cultistId: string
  plan: string              // 'weekly' | 'monthly'
  startedAt: string
  expiresAt: string
}

export type LeaderboardKind = 'devotion' | 'reach' | 'lore'

export interface WorldStats {
  totalDevotion: number     // was worldPopulation
  cellCount: number
  peakCellName: string
  peakDevotion: number
  avgDevotion: number
  dailyChangePercent: number
  worldRiteStockpile: number
}

// ---- Realtime event payloads (spec §10) ----

export interface CellUpdate {
  cellId: string
  devotion: number
  contributorCount: number
  peakDevotion: number
}

export interface CellChant {
  cellId: string
  cultistName: string
}

export interface RiteStrike {
  casterName: string
  casterCellName: string
  targetCellId: string
  riteType: string
  damage: number
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

export interface IndifferenceStrike {
  targetCellId: string
  damage: number
  toLat: number
  toLng: number
}

export interface RevelationEarned {
  revelationName: string
  riteType?: string
}

export interface SanityUpdate {
  sanity: number
  hallucination?: boolean   // client-side dread only; no state change
}

export type GameEvent =
  | { type: 'cell_update'; data: CellUpdate }
  | { type: 'cell_chant'; data: CellChant }
  | { type: 'rite_strike'; data: RiteStrike }
  | { type: 'rite_incoming'; data: RiteStrike }
  | { type: 'indifference_strike'; data: IndifferenceStrike }
  | { type: 'revelation_earned'; data: RevelationEarned }
  | { type: 'sanity_update'; data: SanityUpdate }

export type GameEventType = GameEvent['type']
