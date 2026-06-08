import { useState } from 'react'
import type { Cell } from '../types'

interface LeaderboardProps {
  cells: Cell[]
}

export default function Leaderboard({ cells }: LeaderboardProps) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768)

  return (
    <div className="panel leaderboard-panel" style={{
      top: 20, right: 24, width: 260,
    }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', marginBottom: collapsed ? 0 : 12,
        }}
      >
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase' }}>
          Deepest Devotion
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{collapsed ? '+' : '-'}</span>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cells.length === 0 && (
            <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>The world sleeps</span>
          )}
          {cells.map((cell, i) => (
            <div key={cell.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 0',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', width: 20 }}>
                  {i + 1}.
                </span>
                <span style={{
                  fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {cell.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{cell.countryCode}</span>
              </div>
              <span className="mono" style={{ fontSize: 12, color: 'var(--gold)', flexShrink: 0, marginLeft: 8 }}>
                {cell.devotion.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
