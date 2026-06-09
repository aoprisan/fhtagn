import { useState } from 'react'

interface SanityMeterProps {
  sanity: number
  hallucinating: boolean
  onLucidity: () => void
  onCourt: () => void
}

const TICKS = 24

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

export default function SanityMeter({ sanity, hallucinating, onLucidity, onCourt }: SanityMeterProps) {
  const [open, setOpen] = useState(true)
  const pct = Math.max(0, Math.min(100, sanity))
  const lit = Math.round((pct / 100) * TICKS)
  const color = meterColor(sanity)

  return (
    <div className="panel sanity-panel" style={{
      position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      width: 300, zIndex: 12,
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: open ? 10 : 0 }}
      >
        <span className="eyebrow" style={{ fontSize: 14, color }}>
          Sanity · {label(sanity)}
        </span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>{Math.round(pct)}</span>
      </div>

      {open && (
        <>
          {/* A row of votive candles: each tick a flame, snuffed one by one as the
              mind goes. The last lit candle gutters; hallucination shakes them all. */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 16 }}>
            {Array.from({ length: TICKS }, (_, i) => {
              const isLit = i < lit
              const isGuttering = isLit && i === lit - 1
              const h = 9 + ((i * 7) % 3) * 2.5  // hand-cut, uneven candle heights
              return (
                <span key={i} style={{
                  flex: 1, height: h, borderRadius: 1,
                  background: isLit ? color : 'rgba(255, 255, 255, 0.06)',
                  boxShadow: isLit ? `0 0 7px ${hallucinating ? 'var(--crimson)' : color}` : 'none',
                  animation: isGuttering
                    ? 'tickGutter 1.3s ease-in-out infinite'
                    : hallucinating && isLit ? 'sanityFlicker 0.18s infinite' : 'none',
                  transition: 'background 0.4s, box-shadow 0.4s',
                }} />
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={onLucidity} className="rite-btn" style={{ flex: 1, '--rb': 'var(--teal)' } as React.CSSProperties}>
              Rite of Lucidity
              <span className="rite-btn__hint">+sanity</span>
            </button>
            <button onClick={onCourt} className="rite-btn" style={{ flex: 1, '--rb': '#9a5fe0' } as React.CSSProperties}>
              Court the Tempter
              <span className="rite-btn__hint">summon a bargain</span>
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
        @keyframes tickGutter {
          0%, 100% { opacity: 1; }
          42% { opacity: 0.35; }
          58% { opacity: 0.85; }
          70% { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sanity-panel span { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
