import { useEffect, useRef, useState } from 'react'
import type { Cell, Contributor } from '../types'
import { game } from '../client'
import { PATRON_BY_ID } from '../game/catalog'
import ZigguratViz from './ZigguratViz'

const CONTRIBUTOR_REFRESH_MS = 5000

interface InfoPanelProps {
  cell: Cell
  isHome: boolean
  userDevotion?: number
  rank?: number
}

export default function InfoPanel({ cell, isHome, userDevotion, rank }: InfoPanelProps) {
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [dailyChangePercent, setDailyChangePercent] = useState<number>(0)
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastCellId = useRef(cell.id)

  useEffect(() => {
    let cancelled = false
    const cellChanged = cell.id !== lastCellId.current
    lastCellId.current = cell.id

    const doFetch = () => {
      game.getCellDetail(cell.id).then(detail => {
        if (!cancelled) {
          setContributors(detail.topContributors)
          setDailyChangePercent(detail.dailyChangePercent)
        }
      }).catch(() => {})
    }

    if (cellChanged) {
      clearTimeout(refreshTimer.current)
      doFetch()
    } else {
      if (!refreshTimer.current) {
        refreshTimer.current = setTimeout(() => {
          refreshTimer.current = undefined
          doFetch()
        }, CONTRIBUTOR_REFRESH_MS)
      }
    }

    return () => {
      cancelled = true
      clearTimeout(refreshTimer.current)
      refreshTimer.current = undefined
    }
  }, [cell.id, cell.devotion])

  const patron = cell.patronId ? PATRON_BY_ID[cell.patronId] : null

  return (
    <div className="panel info-panel" style={{
      bottom: 32, left: 24, width: 280,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{cell.name}</span>
          {isHome && (
            <span style={{
              fontSize: 10, background: 'var(--gold)', color: '#000',
              padding: '2px 6px', borderRadius: 4, fontWeight: 600,
            }}>
              YOUR CELL
            </span>
          )}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{cell.country}</span>
        {patron && (
          <div style={{ fontSize: 11, color: patron.color, marginTop: 4 }}>
            sworn to {patron.name}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rank !== undefined && rank > 0 && (
          <Row label="Rank" value={`#${rank}`} color="var(--gold)" />
        )}

        <Row label="Devotion" value={cell.devotion.toLocaleString()} color="var(--gold)" />

        {dailyChangePercent !== 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Daily change</span>
            <span className="mono" style={{
              fontSize: 14,
              color: dailyChangePercent > 0 ? 'var(--teal)' : 'var(--crimson)',
            }}>
              {dailyChangePercent > 0 ? '+' : ''}{dailyChangePercent.toFixed(1)}%
            </span>
          </div>
        )}

        {cell.peakDevotion > 0 && cell.peakDevotion !== cell.devotion && (
          <Row label="Deepest ever" value={cell.peakDevotion.toLocaleString()} />
        )}

        <Row label="Faithful" value={cell.contributorCount.toLocaleString()} />

        {cell.riteStockpile > 0 && (
          <Row label="Rites stirring" value={String(cell.riteStockpile)} color="var(--crimson)" />
        )}

        {cell.claimed > 0 && (
          <Row label="The claimed" value={cell.claimed.toLocaleString()} color="var(--crimson)" />
        )}

        {userDevotion !== undefined && (
          <Row label="Your devotion" value={userDevotion.toLocaleString()} color="var(--gold)" />
        )}
      </div>

      {contributors.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
            The Faithful
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {contributors.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {c.name}
                </span>
                <span className="mono" style={{ color: 'var(--text-dim)', flexShrink: 0, marginLeft: 8 }}>
                  {c.devotion.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cell.devotion > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <ZigguratViz devotion={cell.devotion} />
        </div>
      )}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
      <span className="mono" style={{ fontSize: 14, color: color || 'var(--text)' }}>{value}</span>
    </div>
  )
}
