import type {
  Cell, CellDetail, Cultist, Rite, Pact, WorldStats,
  LeaderboardKind, PatronId, GameEvent, Bargain, BargainOutcome,
  ConvertResult, AwakeningState, GreatRiteResult,
  LiturgyState, BuyResult, LucidityResult,
} from '../types'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'

export interface InvokeResult {
  damage: number
  harvest: number            // devotion returned to the caster's cell (soul harvest)
  riteType: string
  targetCellName: string
}

/**
 * The single seam between the UI and the world. Today only MockGameClient
 * exists (in-browser sim, no server). When the Go backend lands, a
 * LiveGameClient wrapping fetch + WebSocket implements this same interface and
 * the UI does not change. See src/client/index.ts for selection.
 */
export interface GameClient {
  // --- world reads ---
  listCells(): Promise<Cell[]>
  getCellDetail(id: string): Promise<CellDetail>
  leaderboard(kind: LeaderboardKind, limit?: number): Promise<Cell[]>
  stats(): Promise<WorldStats>

  // --- identity ---
  me(): Promise<Cultist | null>
  register(name: string, cellId: string, patronId: PatronId): Promise<Cultist>
  myRites(): Promise<Rite[]>

  // --- actions ---
  chant(): void                                  // emits cell_update
  /** Devotion the next chant will raise, after litany/patron/Veil/tier multipliers. */
  chantPower(): number
  invokeRite(riteId: string, targetCellId: string): Promise<InvokeResult>

  // --- the Liturgy: followers & litanies (v2 growth engine, spec §17) ---
  /** Snapshot of the player's cult economy with all multipliers applied. */
  liturgy(): Promise<LiturgyState>
  /** Buy one follower of the given rank with the home cell's devotion. Emits cell_update. */
  buyFollower(followerId: string): Promise<BuyResult>
  /** Learn the next litany (doubles the chant). Emits cell_update. */
  buyLitany(): Promise<BuyResult>

  // --- ascension (mock-billed) ---
  pact(): Promise<Pact | null>
  ascend(plan: string): Promise<Pact>            // Initiate -> High Priest
  renew(): Promise<Pact>

  // --- sanity (spec §7) ---
  /** Adjust the local cultist's sanity; emits sanity_update. */
  adjustSanity(delta: number, hallucination?: boolean): void
  /** A rite of lucidity — claw sanity back toward Lucid, for a tithe of devotion. */
  riteOfLucidity(): LucidityResult

  // --- the Roil & wards (spec §9) ---
  /** A rite of warding — raise the home cell's ward against the Roil. Emits cell_update. */
  ward(): void

  // --- spread, conversion & the Awakening (spec §9, build phase 6) ---
  /** Carry the word to a cell: convert the uncommitted or flip a rival. Emits cell_converted. */
  convert(targetCellId: string): Promise<ConvertResult>
  /** The endgame snapshot — alignment, season, and your cell's readiness. */
  awakeningState(): Promise<AwakeningState>
  /** Perform the Great Rite — wake your patron and reseed the world. Throws unless ready. */
  greatRite(): Promise<GreatRiteResult>

  // --- bargains: Nyarlathotep, the Tempter (spec §6, §7) ---
  /** The standing offer, if one is open (for restoring across reloads). */
  currentBargain(): Promise<Bargain | null>
  /** Call the Tempter deliberately — he always answers. Emits bargain_offer. */
  courtTempter(): void
  /** Seal the pact: take the grant + visible sanity cost; the hidden catch is now in play. */
  acceptBargain(id: string): Promise<BargainOutcome>
  /** Refuse the pact; the offer is withdrawn, no cost. */
  declineBargain(id: string): void

  // --- realtime ---
  on(handler: (e: GameEvent) => void): () => void   // returns unsubscribe
  connectionState(): ConnectionState
}

/** Minimal synchronous pub/sub used by the mock client and event hooks. */
export class EventBus {
  private handlers = new Set<(e: GameEvent) => void>()

  on(handler: (e: GameEvent) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  emit(e: GameEvent): void {
    for (const h of this.handlers) {
      try { h(e) } catch { /* never let one listener break the loop */ }
    }
  }
}
