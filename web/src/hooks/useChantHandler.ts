import { useState, useCallback, useRef, useEffect } from 'react'
import { game } from '../client'
import { hapticTap, hapticReject, playChant, playReject } from '../feedback'
import type { Cultist, Tier } from '../types'

const RATE_LIMIT = 100
const RATE_WINDOW = 60_000 // 60 seconds

/**
 * Chant input with optimistic update + reconciliation. Reskin of the prototype's
 * useClickHandler — the local pending total stays personal; cell devotion is a
 * world counter and cannot safely confirm individual chants.
 */
export function useChantHandler(
  cultist: Cultist | null,
  onOptimisticChant: () => void,
) {
  const [pendingChants, setPendingChants] = useState(0)
  const chantTimestamps = useRef<number[]>([])
  const confirmedTotalRef = useRef(cultist?.totalChants ?? 0)

  const [rateLimited, setRateLimited] = useState(false)
  const rateLimitTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(rateLimitTimer.current), [])

  // Chant power carries every multiplier (litanies, patron, tier, the Veil);
  // the client computes it so optimistic updates match the authoritative gain.
  const multiplier = cultist && cultist.tier !== 'witness' ? Math.max(1, game.chantPower()) : 1

  useEffect(() => {
    const confirmed = cultist?.totalChants ?? 0
    const delta = confirmed - confirmedTotalRef.current
    confirmedTotalRef.current = confirmed
    if (delta > 0) setPendingChants(prev => Math.max(0, prev - delta))
  }, [cultist?.totalChants])

  const handleChant = useCallback(() => {
    if (!cultist || cultist.tier === 'witness') return

    const now = Date.now()
    chantTimestamps.current = chantTimestamps.current.filter(t => now - t < RATE_WINDOW)
    if (chantTimestamps.current.length >= RATE_LIMIT) {
      setRateLimited(true)
      hapticReject()
      playReject()
      clearTimeout(rateLimitTimer.current)
      rateLimitTimer.current = setTimeout(() => setRateLimited(false), 2000)
      return
    }

    // Intensity climbs with the recent chanting cadence so a fast streak feels
    // like it's building toward something.
    const recent = chantTimestamps.current.filter(t => now - t < 2500).length
    hapticTap()
    playChant(Math.min(1, recent / 12))

    chantTimestamps.current.push(now)

    setPendingChants(prev => prev + multiplier)
    onOptimisticChant()

    game.chant()
  }, [cultist, onOptimisticChant, multiplier])

  const personalChants = (cultist?.totalChants ?? 0) + pendingChants

  return { handleChant, personalChants, pendingChants, rateLimited, multiplier }
}

export type { Tier }
