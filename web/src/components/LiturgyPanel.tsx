import { useCallback, useEffect, useState } from 'react'
import { game } from '../client'
import { FOLLOWERS, LITANIES, followerCost } from '../game/liturgy'
import { patronMods } from '../game/catalog'
import type { Cultist, LiturgyState } from '../types'

const REFRESH_MS = 2000

interface LiturgyPanelProps {
  cultist: Cultist
  homeDevotion: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`
  return Math.round(n).toLocaleString()
}

/**
 * The Liturgy — the cult's growth engine (v2). Followers earn devotion per
 * second; litanies double the chant. Purchases spend the home cell's devotion.
 */
export default function LiturgyPanel({ cultist, homeDevotion }: LiturgyPanelProps) {
  const [state, setState] = useState<LiturgyState | null>(null)
  const [open, setOpen] = useState(true)

  const refresh = useCallback(() => {
    game.liturgy().then(setState).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [refresh])

  if (!state) return null

  const growth = patronMods(cultist.patronId).followerCostGrowth
  const nextLitany = LITANIES[state.litanies]
  // Show the cheapest unowned rank as a teaser, but not the deeper unknowns.
  const visibleFollowers = FOLLOWERS.filter((f, i) => {
    if ((state.followers[f.id] ?? 0) > 0) return true
    const prev = FOLLOWERS[i - 1]
    return i === 0 || (prev && (state.followers[prev.id] ?? 0) > 0)
  })

  const buyFollower = (id: string) => { game.buyFollower(id).then(refresh).catch(() => {}) }
  const buyLitany = () => { game.buyLitany().then(refresh).catch(() => {}) }

  return (
    <div className="panel liturgy-panel" style={{
      position: 'absolute', bottom: 32, right: 290, width: 270, zIndex: 11,
      maxHeight: '52vh', overflowY: 'auto',
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: open ? 8 : 0 }}
      >
        <span className="eyebrow" style={{ fontSize: 14, color: 'var(--gold)' }}>The Liturgy</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--teal)' }}>
          {fmt(state.devotionPerSec)}/s
        </span>
      </div>

      {open && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
            <span>Chant +{state.chantPower.toLocaleString()}</span>
            <span title="The Veil: devotion gain multiplies as the mind frays">
              the Veil <span className="mono" style={{ color: state.veil > 1.6 ? 'var(--crimson)' : state.veil > 1.15 ? 'var(--gold)' : 'var(--text)' }}>×{state.veil.toFixed(2)}</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleFollowers.map(f => {
              const owned = state.followers[f.id] ?? 0
              const cost = followerCost(f, owned, growth)
              const affordable = homeDevotion >= cost
              return (
                <button
                  key={f.id}
                  onClick={() => buyFollower(f.id)}
                  disabled={!affordable}
                  title={f.flavor}
                  style={{
                    textAlign: 'left', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px',
                    color: 'var(--text)', cursor: affordable ? 'pointer' : 'default',
                    opacity: affordable ? 1 : 0.45, transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>
                      {f.name}{owned > 0 && <span className="mono" style={{ color: 'var(--text-dim)' }}> ×{owned}</span>}
                    </span>
                    <span className="mono" style={{ color: 'var(--gold)' }}>{fmt(cost)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                    +{f.rate.toLocaleString()}/s each
                  </div>
                </button>
              )
            })}

            {nextLitany && (
              <button
                onClick={buyLitany}
                disabled={homeDevotion < nextLitany.cost}
                title="Each litany learned doubles the chant"
                style={{
                  textAlign: 'left', background: 'rgba(216,169,58,0.07)',
                  border: '1px solid rgba(216,169,58,0.35)', borderRadius: 8, padding: '7px 10px',
                  color: 'var(--text)', cursor: homeDevotion >= nextLitany.cost ? 'pointer' : 'default',
                  opacity: homeDevotion >= nextLitany.cost ? 1 : 0.45, transition: 'opacity 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{nextLitany.name}</span>
                  <span className="mono" style={{ color: 'var(--gold)' }}>{fmt(nextLitany.cost)}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                  doubles the chant ({state.litanies}/{LITANIES.length} learned)
                </div>
              </button>
            )}
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.4 }}>
            Devotion is spent from your cell. Followers endure even when the world is unmade.
          </div>
        </>
      )}
    </div>
  )
}
