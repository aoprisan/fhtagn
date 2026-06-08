import { useState, useCallback } from 'react'
import type { Tier } from '../types'

interface Particle {
  id: number
  dx: number
  dy: number
}

interface ChantButtonProps {
  onChant: () => void
  personalChants: number
  cellName?: string
  rateLimited?: boolean
  tier: Tier
  multiplier: number
}

export default function ChantButton({ onChant, personalChants, cellName, rateLimited, tier, multiplier }: ChantButtonProps) {
  const [pressing, setPressing] = useState(false)
  const [ripples, setRipples] = useState<number[]>([])
  const [particles, setParticles] = useState<Particle[]>([])

  const handleChant = useCallback(() => {
    if (tier === 'witness') {
      onChant() // triggers the joining flow
      return
    }

    setPressing(true)
    setTimeout(() => setPressing(false), 100)

    const id = Date.now()
    setRipples(prev => [...prev, id])
    setTimeout(() => setRipples(prev => prev.filter(r => r !== id)), 600)

    const dist = 50 + Math.random() * 20
    const newParticles: Particle[] = Array.from({ length: 10 }, (_, i) => {
      const angle = ((360 / 10) * i + Math.random() * 20 - 10) * (Math.PI / 180)
      return { id: id + i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist }
    })
    setParticles(prev => [...prev, ...newParticles])
    setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id))), 500)

    onChant()
  }, [onChant, tier])

  const buttonLabel = tier === 'witness' ? 'JOIN' : `CHANT +${multiplier}`

  return (
    <div className="click-button-area" style={{
      position: 'absolute', bottom: 32, right: 32, zIndex: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      {cellName && tier !== 'witness' && (
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
          {cellName}
        </span>
      )}

      <div style={{ position: 'relative' }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: 'absolute', left: '50%', top: '50%', width: 6, height: 6,
            borderRadius: '50%', background: 'var(--teal)',
            pointerEvents: 'none', zIndex: 20,
            opacity: 0,
            animation: 'particleFade 0.5s ease-out forwards',
            '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
          } as React.CSSProperties} />
        ))}

        {ripples.map(id => (
          <div key={id} style={{
            position: 'absolute', inset: -10,
            borderRadius: '50%', border: '2px solid var(--teal)',
            animation: 'ripple 0.6s ease-out forwards',
            pointerEvents: 'none',
          }} />
        ))}

        <button
          onClick={handleChant}
          style={{
            width: 120, height: 120, borderRadius: '50%',
            background: tier === 'witness'
              ? 'radial-gradient(circle at 35% 35%, #3a8f82, #1f9e8f, #0d4f47)'
              : 'radial-gradient(circle at 35% 35%, #2fc4b2, var(--teal), #0d4f47)',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 0 30px rgba(31, 158, 143, 0.35), inset 0 -3px 6px rgba(0,0,0,0.4)',
            transform: pressing ? 'scale(0.92)' : 'scale(1)',
            transition: 'transform 0.1s ease',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700,
            color: '#04110f',
          }}
        >
          {buttonLabel}
        </button>
      </div>

      {tier !== 'witness' && (
        <span className="mono" style={{ fontSize: 16, color: 'var(--gold)' }}>
          {personalChants.toLocaleString()}
        </span>
      )}

      {rateLimited && (
        <span style={{
          fontSize: 11, color: 'var(--crimson)', fontFamily: 'var(--font-sans)',
          animation: 'fadeInOut 2s ease-out forwards',
        }}>
          The words tangle — slow down.
        </span>
      )}

      <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes particleFade {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
        }
        @keyframes fadeInOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
