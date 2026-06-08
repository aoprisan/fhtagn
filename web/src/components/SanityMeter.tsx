import { useState } from 'react'

interface SanityMeterProps {
  sanity: number
  hallucinating: boolean
  onLucidity: () => void
  onDelve: () => void
}

function label(sanity: number): string {
  if (sanity > 80) return 'Lucid'
  if (sanity > 55) return 'Uneasy'
  if (sanity > 30) return 'Fraying'
  if (sanity > 12) return 'Slipping'
  return 'Unravelled'
}

function meterColor(sanity: number): string {
  // teal (lucid) → gold → crimson (unravelled)
  if (sanity > 55) return 'var(--teal)'
  if (sanity > 25) return 'var(--gold)'
  return 'var(--crimson)'
}

export default function SanityMeter({ sanity, hallucinating, onLucidity, onDelve }: SanityMeterProps) {
  const [open, setOpen] = useState(true)
  const pct = Math.max(0, Math.min(100, sanity))

  return (
    <div className="panel sanity-panel" style={{
      position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      width: 300, zIndex: 12,
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: open ? 10 : 0 }}
      >
        <span className="eyebrow" style={{ fontSize: 14, color: meterColor(sanity) }}>
          Sanity · {label(sanity)}
        </span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>{Math.round(pct)}</span>
      </div>

      {open && (
        <>
          <div style={{
            position: 'relative', height: 10, borderRadius: 6,
            background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
            boxShadow: hallucinating ? '0 0 14px var(--crimson)' : 'none',
            transition: 'box-shadow 0.2s',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${pct}%`, background: meterColor(sanity),
              transition: 'width 0.3s ease, background 0.4s',
              animation: hallucinating ? 'sanityFlicker 0.18s infinite' : 'none',
            }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={onLucidity} style={btn('var(--teal)')}>
              Rite of Lucidity
              <span style={hint}>+sanity</span>
            </button>
            <button onClick={onDelve} style={btn('var(--crimson)')}>
              Delve for Power
              <span style={hint}>−sanity, +rite</span>
            </button>
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.4 }}>
            Forbidden power costs your mind. Low sanity unlocks the strongest rites — and lets
            things slip in that were never there.
          </div>
        </>
      )}

      <style>{`
        @keyframes sanityFlicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  )
}

function btn(color: string): React.CSSProperties {
  return {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}`,
    borderRadius: 8, padding: '8px 6px', color, cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
  }
}

const hint: React.CSSProperties = { fontSize: 9, color: 'var(--text-dim)', fontWeight: 400, marginTop: 2 }
