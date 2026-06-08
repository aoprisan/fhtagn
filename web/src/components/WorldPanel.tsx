import type { WorldStats, AwakeningState } from '../types'

interface WorldPanelProps {
  stats: WorldStats | null
  totalDevotion: number
  awakening: AwakeningState | null
}

export default function WorldPanel({ stats, totalDevotion, awakening }: WorldPanelProps) {
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

      {/* The Convergence — a thin telegraph that the stars are coming right (spec §9). */}
      {awakening && (awakening.aligned || awakening.progress > 0.35) && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          {awakening.aligned ? (
            <span style={{
              fontSize: 10, letterSpacing: 2, color: 'var(--gold)', fontWeight: 700,
              textShadow: '0 0 12px rgba(216,169,58,0.6)', animation: 'convergeBlink 1.6s ease-in-out infinite',
            }}>
              ✦ THE STARS ARE RIGHT ✦
            </span>
          ) : (
            <span style={{ fontSize: 9, letterSpacing: 1, color: 'var(--text-dim)' }}>
              the Convergence · {Math.round(awakening.progress * 100)}%
            </span>
          )}
          <div style={{ width: 180, height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.round(awakening.progress * 100)}%`,
              background: awakening.aligned ? 'var(--gold)' : 'linear-gradient(90deg, var(--teal), var(--gold))',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes convergeBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
