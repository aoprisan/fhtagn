import { useEffect, useRef, useState } from 'react'
import type { Bargain } from '../types'

interface TempterCardProps {
  bargain: Bargain
  onAccept: (id: string) => void
  onDecline: (id: string) => void
}

// Seconds the offer stands before the Tempter withdraws it (auto-declines).
const STAND_SECONDS = 14

const VIOLET = '#9a5fe0'

/**
 * Nyarlathotep's offer (spec §6, §7). The grant and the sanity cost are shown;
 * the catch is *not* — only the flavour hints it, and a standing reminder that
 * the price is unnamed. That asymmetry is the gamble. Refusing costs nothing;
 * letting the countdown lapse refuses for you.
 */
export default function TempterCard({ bargain, onAccept, onDecline }: TempterCardProps) {
  const [left, setLeft] = useState(STAND_SECONDS)
  const declined = useRef(false)

  // Fresh countdown whenever a new offer arrives.
  useEffect(() => {
    setLeft(STAND_SECONDS)
    declined.current = false
  }, [bargain.id])

  useEffect(() => {
    const t = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) {
          clearInterval(t)
          if (!declined.current) { declined.current = true; onDecline(bargain.id) }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [bargain.id, onDecline])

  const decline = () => {
    if (declined.current) return
    declined.current = true
    onDecline(bargain.id)
  }

  return (
    <div className="panel tempter-card" style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 'min(360px, calc(100vw - 32px))', zIndex: 60,
      border: `1px solid ${VIOLET}66`,
      boxShadow: `0 0 40px ${VIOLET}40, inset 0 0 24px ${VIOLET}1a`,
      background: 'rgba(18, 10, 26, 0.92)', backdropFilter: 'blur(10px)',
      padding: 18, animation: 'tempterIn 0.4s ease-out',
    }}>
      <div className="eyebrow" style={{ fontSize: 11, color: VIOLET, letterSpacing: 2, marginBottom: 6 }}>
        The Crawling Chaos · a bargain
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--text)', marginBottom: 10 }}>
        {bargain.title}
      </div>
      <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--text-dim)', lineHeight: 1.55, marginBottom: 14 }}>
        “{bargain.flavor}”
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <Row label="It offers" value={bargain.grantLabel} color="var(--teal)" />
        <Row
          label="It asks"
          value={bargain.sanityCost > 0 ? `${bargain.sanityCost} sanity, now` : 'nothing — it says'}
          color="var(--gold)"
        />
        <Row label="The price" value="unnamed, and later" color={VIOLET} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { if (!declined.current) { declined.current = true; onAccept(bargain.id) } }} style={{
          flex: 1, background: VIOLET, border: 'none', borderRadius: 8, padding: '10px 0',
          color: '#0a0410', cursor: 'pointer', fontWeight: 700, fontSize: 13,
        }}>
          Seal the pact
        </button>
        <button onClick={decline} style={{
          flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '10px 0', color: 'var(--text-dim)', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>
          Refuse
        </button>
      </div>

      <div style={{ marginTop: 12, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${(left / STAND_SECONDS) * 100}%`, background: `${VIOLET}cc`,
          transition: 'width 1s linear',
        }} />
      </div>

      <style>{`
        @keyframes tempterIn {
          0% { transform: translate(-50%, -46%); opacity: 0; }
          100% { transform: translate(-50%, -50%); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ color, textAlign: 'right', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
