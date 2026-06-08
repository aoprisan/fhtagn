import { useState, useEffect } from 'react'
import type { Tier, Pact } from '../types'
import { game } from '../client'

interface PactPanelProps {
  tier: Tier
  onAscended: () => void
}

export default function PactPanel({ tier, onAscended }: PactPanelProps) {
  const [pact, setPact] = useState<Pact | null>(null)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    game.pact().then(setPact).catch(() => {})
  }, [tier])

  if (tier === 'witness') return null

  const isExpired = pact ? new Date(pact.expiresAt) < new Date() : true
  const daysLeft = pact ? Math.max(0, Math.ceil((new Date(pact.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
  const canEarlyRenew = daysLeft > 0 && daysLeft <= 2

  if (tier === 'highPriest' && !show) {
    return (
      <div className="subscription-panel" style={{
        position: 'absolute', top: 80, left: 24, zIndex: 10,
      }}>
        <button
          onClick={() => setShow(true)}
          style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
            padding: '4px 10px', fontSize: 10, color: 'var(--text-dim)', cursor: 'pointer',
          }}
        >
          The Pact {daysLeft > 0 ? `(${daysLeft}d left)` : '(lapsed)'}
        </button>
      </div>
    )
  }

  const handleAscend = async (plan: string) => {
    setLoading(true)
    try {
      const next = await game.ascend(plan)
      setPact(next)
      onAscended()
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const handleRenew = async () => {
    setLoading(true)
    try {
      const next = await game.renew()
      setPact(next)
      onAscended()
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  if (tier === 'initiate') {
    return (
      <div className="panel subscription-panel" style={{
        top: 80, left: 24, width: 260,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Ascend to High Priest
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.5 }}>
          2× devotion per chant, ornate sigil tiers, forbidden tomes, swifter rites
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleAscend('weekly')}
            disabled={loading}
            style={{
              flex: 1, background: 'var(--gold)', border: 'none', borderRadius: 8,
              padding: '8px 0', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 12,
              opacity: loading ? 0.5 : 1,
            }}
          >
            $1.99/wk
          </button>
          <button
            onClick={() => handleAscend('monthly')}
            disabled={loading}
            style={{
              flex: 1, background: 'var(--gold)', border: 'none', borderRadius: 8,
              padding: '8px 0', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 12,
              opacity: loading ? 0.5 : 1,
            }}
          >
            $4.99/mo
          </button>
        </div>
      </div>
    )
  }

  // High Priest view (expanded)
  return (
    <div className="panel subscription-panel" style={{
      top: 80, left: 24, width: 240,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 1 }}>
          The Pact
        </span>
        <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}>×</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
        {isExpired ? 'Lapsed' : `${daysLeft} days remain`} · {pact?.plan}
      </div>
      {(isExpired || canEarlyRenew) && (
        <button
          onClick={handleRenew}
          disabled={loading}
          style={{
            width: '100%', background: 'var(--gold)', border: 'none', borderRadius: 8,
            padding: '8px 0', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 12,
            opacity: loading ? 0.5 : 1,
          }}
        >
          {canEarlyRenew ? 'Reaffirm Early (20% longer)' : 'Reaffirm the Pact'}
        </button>
      )}
    </div>
  )
}
