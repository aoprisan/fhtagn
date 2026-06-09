import { useState, useEffect } from 'react'
import type { Cell, LeaderboardKind } from '../types'
import { game } from '../client'

interface LeaderboardProps {
  // Bumped by App when the world shifts, so the active board re-fetches.
  version: number
}

// The three boards of spec §9: faith, spread, and forbidden knowledge.
const BOARDS: {
  kind: LeaderboardKind; tab: string; title: string
  metric: (c: Cell) => string; value: (c: Cell) => number
}[] = [
  { kind: 'devotion', tab: 'Devotion', title: 'Deepest Devotion', metric: c => c.devotion.toLocaleString(), value: c => c.devotion },
  { kind: 'reach', tab: 'Reach', title: 'Widest Reach', metric: c => `${c.reach} reached`, value: c => c.reach },
  { kind: 'lore', tab: 'Lore', title: 'Deepest Lore', metric: c => `${c.lore} lore`, value: c => c.lore },
]

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export default function Leaderboard({ version }: LeaderboardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [kind, setKind] = useState<LeaderboardKind>('devotion')
  const [cells, setCells] = useState<Cell[]>([])

  const board = BOARDS.find(b => b.kind === kind)!

  useEffect(() => {
    let cancelled = false
    game.leaderboard(kind, 10).then(c => { if (!cancelled) setCells(c) }).catch(() => {})
    return () => { cancelled = true }
  }, [kind, version])

  const max = Math.max(...cells.map(board.value), 1)

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
        <span className="eyebrow" style={{ fontSize: 14, color: 'var(--teal)' }}>
          {board.title}
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{collapsed ? '+' : '-'}</span>
      </div>

      {!collapsed && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {BOARDS.map(b => (
              <button
                key={b.kind}
                onClick={() => setKind(b.kind)}
                style={{
                  flex: 1, padding: '4px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  borderRadius: 6, border: `1px solid ${kind === b.kind ? 'var(--teal)' : 'var(--border)'}`,
                  background: kind === b.kind ? 'rgba(43,191,168,0.12)' : 'transparent',
                  color: kind === b.kind ? 'var(--teal)' : 'var(--text-dim)',
                }}
              >
                {b.tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {cells.length === 0 && (
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>The world sleeps</span>
            )}
            {cells.map((cell, i) => {
              const frac = board.value(cell) / max
              const first = i === 0
              return (
                <div key={cell.id} style={{
                  position: 'relative', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '4px 6px 5px', overflow: 'hidden',
                }}>
                  {/* Depth bar: how far each cell has sunk, relative to the deepest. */}
                  <div aria-hidden style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${Math.max(frac * 100, 2)}%`,
                    background: first
                      ? 'linear-gradient(90deg, rgba(216,169,58,0.13), rgba(216,169,58,0.02))'
                      : 'linear-gradient(90deg, rgba(43,191,168,0.11), rgba(43,191,168,0.015))',
                    borderRight: `1px solid ${first ? 'rgba(216,169,58,0.4)' : 'rgba(70,230,205,0.22)'}`,
                    pointerEvents: 'none',
                    transition: 'width 0.6s ease',
                  }} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0, position: 'relative' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 12, width: 22, flexShrink: 0,
                      color: first ? 'var(--gold)' : 'var(--text-faint)',
                      textShadow: first ? '0 0 10px rgba(216,169,58,0.5)' : 'none',
                      letterSpacing: 1,
                    }}>
                      {NUMERALS[i] ?? i + 1}
                    </span>
                    <span style={{
                      fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {cell.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{cell.countryCode}</span>
                  </div>
                  <span className="mono" style={{
                    fontSize: 12, color: 'var(--gold)', flexShrink: 0, marginLeft: 8, position: 'relative',
                  }}>
                    {board.metric(cell)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
