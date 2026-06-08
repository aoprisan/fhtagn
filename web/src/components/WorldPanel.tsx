import type { WorldStats } from '../types'

interface WorldPanelProps {
  stats: WorldStats | null
  totalDevotion: number
}

export default function WorldPanel({ stats, totalDevotion }: WorldPanelProps) {
  return (
    <div className="global-counter" style={{
      position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10, textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
        Devotion across the world
      </div>
      <div className="mono" style={{ fontSize: 20, color: 'var(--gold)', fontWeight: 700 }}>
        {totalDevotion.toLocaleString()}
      </div>
      {stats && (
        <>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6 }}>
            {stats.worldRiteStockpile > 0 && (
              <span style={{ fontSize: 10, color: 'var(--crimson)' }}>
                {stats.worldRiteStockpile} rites stir
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
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
        </>
      )}
    </div>
  )
}
