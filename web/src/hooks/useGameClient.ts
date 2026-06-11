import { useEffect, useRef, useState } from 'react'
import { game, ConnectionState } from '../client'
import type {
  CellUpdate, CellChant, RiteStrike, RoilStrike, RevelationEarned, SanityUpdate,
  MadnessToll, Bargain, BargainSprung, CellConverted, AwakeningProgress, AwakeningTriggered,
} from '../types'

export type { ConnectionState }

export interface GameClientHandlers {
  onCellUpdate?: (u: CellUpdate) => void
  onCellChant?: (c: CellChant) => void
  onRiteStrike?: (s: RiteStrike) => void
  onRiteIncoming?: (s: RiteStrike) => void
  onRoil?: (s: RoilStrike) => void
  onRevelation?: (r: RevelationEarned) => void
  onSanity?: (s: SanityUpdate) => void
  onMadnessToll?: (t: MadnessToll) => void
  onBargainOffer?: (b: Bargain) => void
  onBargainSprung?: (s: BargainSprung) => void
  onCellConverted?: (c: CellConverted) => void
  onAwakeningProgress?: (a: AwakeningProgress) => void
  onAwakeningTriggered?: (a: AwakeningTriggered) => void
}

/**
 * Subscribes to the shared GameClient event stream and routes each event to the
 * matching callback. Replaces the old useWebSocket — same role, but the source
 * is the GameClient (mock today, live backend later).
 */
export function useGameClient(handlers: GameClientHandlers) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(game.connectionState())
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const unsubscribe = game.on(e => {
      const h = ref.current
      switch (e.type) {
        case 'cell_update': h.onCellUpdate?.(e.data); break
        case 'cell_chant': h.onCellChant?.(e.data); break
        case 'rite_strike': h.onRiteStrike?.(e.data); break
        case 'rite_incoming': h.onRiteIncoming?.(e.data); break
        case 'roil_strike': h.onRoil?.(e.data); break
        case 'revelation_earned': h.onRevelation?.(e.data); break
        case 'sanity_update': h.onSanity?.(e.data); break
        case 'madness_toll': h.onMadnessToll?.(e.data); break
        case 'bargain_offer': h.onBargainOffer?.(e.data.bargain); break
        case 'bargain_sprung': h.onBargainSprung?.(e.data); break
        case 'cell_converted': h.onCellConverted?.(e.data); break
        case 'awakening_progress': h.onAwakeningProgress?.(e.data); break
        case 'awakening_triggered': h.onAwakeningTriggered?.(e.data); break
      }
    })
    setConnectionState(game.connectionState())
    return unsubscribe
  }, [])

  return { connectionState }
}
