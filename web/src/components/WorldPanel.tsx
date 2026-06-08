import type { WorldStats } from '../types'

interface WorldPanelProps {
  stats: WorldStats | null
  totalDevotion: number
}

export default function WorldPanel({ stats, totalDevotion }: WorldPanelProps) {
  return (
    <div className="global-counter" style={{
      position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
      zIndex: 12, textAlign: 'center',
    }}>
      <div className="eyebrow" style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 1 }}>
        Devotion across the world
      </div>
      <div className="mono" style={{
        fontSize: 22, color: 'var(--gold)', fontWeight: 400,
        textShadow: '0 0 18px rgba(216,169,58,0.35)',
      }}>
        {totalDevotion.toLocaleString()}
      </div>
      {stats && (
        <div className="world-stats">
          {stats.worldRiteStockpile > 0 && (
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 5 }}>
              <span style={{ fontSize: 10, color: 'var(--crimson)', letterSpacing: 0.5 }}>
                {stats.worldRiteStockpile} rites stir
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              {stats.cellCount} cells
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              avg {Math.round(stats.avgDevotion).toLocaleString()}
            </span>
            {stats.peakDevotion > 0 && (
              <span style={{ fontSize: 10, color: 'var(--gold)' }}>
                deepest {stats.peakCellName} ({stats.peakDevotion.toLocaleString()})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
