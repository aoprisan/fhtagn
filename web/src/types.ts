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

// ---- Bargains: Nyarlathotep, the Tempter (spec §4 "seal a bargain", §6, §7, §11) ----
//
// A bargain is a genuine gamble, not a timer to optimise (spec §7, the #1 thing
// to get right): the power grant and the immediate sanity cost are *shown*; the
// catch is *hidden*. The flavour hints at a price, but its chance and magnitude
// are concealed, and it springs probabilistically over a later window — so you
// cannot reduce accepting to a known trade. Delve deeper (lower sanity) and the
// offers get stronger AND the catches get worse: the delve→gain→claw-back loop.

export type BargainKind =
  | 'gift'     // a forbidden rite, freely given
  | 'clarity'  // sanity restored — the cruellest mask
  | 'swarm'    // a surge of devotion to your cell
  | 'tome'     // forbidden lore: the strongest rite, the deepest cost

export type BargainCatchKind =
  | 'attention'      // the patron's lethal attention — a strike on your home cell
  | 'defection'      // cultists turn; devotion and contributors bleed away
  | 'false-clarity'  // the offered calm collapses; sanity crashes below where it began

/** The hidden price. Never shown numerically to the player — only the flavour hints it. */
export interface BargainCatch {
  kind: BargainCatchKind
  chance: number            // P(springs at all) over the window — hidden from the UI
  devotionLoss?: number
  contributorLoss?: number
  sanityCrash?: number
}

/** A pact proposed by Nyarlathotep. `bargain_offer` carries one of these. */
export interface Bargain {
  id: string
  kind: BargainKind
  title: string
  flavor: string            // the temptation; obliquely hints the catch
  // What you gain — visible. Exactly one of the grant fields is set.
  grantLabel: string
  grantRiteType?: string
  grantDevotion?: number
  grantSanity?: number
  sanityCost: number        // visible, immediate
  catch: BargainCatch       // hidden
  window: number            // ticks over which the catch may spring once accepted
  expiresInTicks: number    // ignored this long → withdrawn
}

/** Result of accepting — a human description of the immediate, visible effect. */
export interface BargainOutcome {
  granted: string
  sanityCost: number
}

/** `bargain_sprung`: the catch resolving later (sprung) — or passing harmlessly. */
export interface BargainSprung {
  kind: BargainCatchKind | 'passed'
  sprung: boolean
  message: string
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
  | { type: 'bargain_offer'; data: { bargain: Bargain } }
  | { type: 'bargain_sprung'; data: BargainSprung }

export type GameEventType = GameEvent['type']
