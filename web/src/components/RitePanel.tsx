import { useState, useEffect, useCallback } from 'react'
import type { Rite, Tier } from '../types'
import { game } from '../client'
import { FAMILY_COLOR } from '../game/catalog'

interface RitePanelProps {
  tier: Tier
  onInvokeRite: (rite: Rite) => void
  refreshKey: number
}

export default function RitePanel({ tier, onInvokeRite, refreshKey }: RitePanelProps) {
  const [rites, setRites] = useState<Rite[]>([])
  const [collapsed, setCollapsed] = useState(false)

  const loadRites = useCallback(() => {
    if (tier === 'witness') return
    game.myRites().then(setRites).catch(() => {})
  }, [tier])

  useEffect(() => {
    loadRites()
  }, [loadRites, refreshKey])

  if (tier === 'witness' || rites.length === 0) return null

  return (
    <div className="panel missile-panel" style={{
      top: 330, right: 24, width: 250,
    }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', marginBottom: collapsed ? 0 : 10,
        }}
      >
        <span className="eyebrow" style={{ fontSize: 14, color: 'var(--crimson)' }}>
          Rites Known ({rites.length})
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{collapsed ? '+' : '-'}</span>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rites.map(r => (
            <div key={r.id} style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: FAMILY_COLOR[r.family] }}>
                    {r.riteType}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {r.source === 'revelation' ? 'Revelation' : 'Devotion'} · {r.rangeKm}km · {r.damageLower.toLocaleString()}–{r.damageUpper.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => onInvokeRite(r)}
                  style={{
                    background: 'var(--crimson)', border: 'none', borderRadius: 6,
                    padding: '4px 10px', fontSize: 11, fontWeight: 600,
                    color: '#0a0a12', cursor: 'pointer',
                  }}
                >
                  TRACE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
