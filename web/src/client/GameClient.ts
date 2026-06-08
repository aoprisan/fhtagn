import type {
  Cell, CellDetail, Cultist, Rite, Pact, WorldStats,
  LeaderboardKind, PatronId, GameEvent,
} from '../types'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'

export interface InvokeResult {
  damage: number
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
  chant(): void                                  // emits cell_update (+ sanity_update)
  invokeRite(riteId: string, targetCellId: string): Promise<InvokeResult>

  // --- ascension (mock-billed) ---
  pact(): Promise<Pact | null>
  ascend(plan: string): Promise<Pact>            // Initiate -> High Priest
  renew(): Promise<Pact>

  // --- sanity (spec §7) ---
  /** Adjust the local cultist's sanity; emits sanity_update. */
  adjustSanity(delta: number, hallucination?: boolean): void
  /** A rite of lucidity — claw sanity back toward Lucid. */
  riteOfLucidity(): void
  /** Accept an eldritch gift: lose sanity, gain a forbidden rite (the gamble). */
  delve(): Promise<{ riteType: string; sanityCost: number }>

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
