import type { Cultist } from '../types'
import { PATRON_BY_ID } from '../game/catalog'

interface CultistPanelProps {
  cultist: Cultist
  personalChants: number
  cellName?: string
}

const TIER_LABEL: Record<string, string> = {
  witness: 'Witness',
  initiate: 'Initiate',
  highPriest: 'High Priest',
}

export default function CultistPanel({ cultist, personalChants, cellName }: CultistPanelProps) {
  const patron = cultist.patronId ? PATRON_BY_ID[cultist.patronId] : null
  return (
    <div className="panel player-panel" style={{
      bottom: 210, right: 24, width: 220,
    }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--gold)' }}>{cultist.name}</span>
          {cultist.tier === 'highPriest' && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>2× devotion</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {TIER_LABEL[cultist.tier]} {cellName && `· ${cellName}`}
        </div>
        {patron && (
          <div style={{ fontSize: 11, color: patron.color, marginTop: 2 }}>
            serves {patron.name}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <StatRow label="Devotion raised" value={personalChants.toLocaleString()} color="var(--gold)" />
        {cultist.souls > 0 && <StatRow label="Souls claimed" value={cultist.souls.toLocaleString()} color="var(--crimson)" />}
        {cultist.best10s > 0 && <StatRow label="Best 10s" value={cultist.best10s.toLocaleString()} />}
        {(cultist.todayChants !== undefined && cultist.todayChants > 0) && <StatRow label="Today" value={cultist.todayChants.toLocaleString()} />}
        {cultist.best1day > 0 && <StatRow label="Best 1 day" value={cultist.best1day.toLocaleString()} />}
      </div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span className="mono" style={{ color: color || 'var(--text)' }}>{value}</span>
    </div>
  )
}
