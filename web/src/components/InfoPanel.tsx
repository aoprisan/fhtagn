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
  onSpread?: () => void
}

export default function InfoPanel({ cell, isHome, userDevotion, rank, onSpread }: InfoPanelProps) {
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
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: 1, color: 'var(--text)' }}>{cell.name}</span>
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

        {(cell.reach > 0 || isHome) && (
          <Row label="Reach" value={`${cell.reach} cells`} color="var(--teal)" />
        )}

        {(cell.lore > 0 || isHome) && (
          <Row label="Lore" value={String(cell.lore)} color="var(--gold)" />
        )}

        {(cell.wardLevel > 0 || isHome) && (
          <Row label="Wards" value={`${Math.round(cell.wardLevel)}%`} color="var(--violet)" />
        )}

        {userDevotion !== undefined && (
          <Row label="Your devotion" value={userDevotion.toLocaleString()} color="var(--gold)" />
        )}
      </div>

      {isHome && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => game.ward()}
            title="Raise the wards against the Roil — they erode over time and must be tended"
            style={{
              flex: 1, background: 'rgba(124, 107, 176, 0.08)',
              border: '1px solid var(--violet)', borderRadius: 8, padding: '8px 6px',
              color: 'var(--violet)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
          >
            Tend the Wards
            <span style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 400, marginTop: 2 }}>
              shelter from the Roil
            </span>
          </button>
          {onSpread && (
            <button
              onClick={onSpread}
              title="Carry the word to a nearby cell — convert the uncommitted, or flip a rival you overpower"
              style={{
                flex: 1, background: 'rgba(43, 191, 168, 0.08)',
                border: '1px solid var(--teal)', borderRadius: 8, padding: '8px 6px',
                color: 'var(--teal)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}
            >
              Spread the Word
              <span style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 400, marginTop: 2 }}>
                convert a nearby cell
              </span>
            </button>
          )}
        </div>
      )}

      {contributors.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <span className="eyebrow" style={{ fontSize: 13, color: 'var(--teal)' }}>
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
