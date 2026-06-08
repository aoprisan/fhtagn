import { useState, useMemo } from 'react'
import { game } from '../client'
import { PATRONS } from '../game/catalog'
import type { Cell, Cultist, PatronId } from '../types'

interface OnboardingProps {
  cells: Cell[]
  onRegistered: (cultist: Cultist) => void
  fading?: boolean
}

export default function Onboarding({ cells, onRegistered, fading }: OnboardingProps) {
  const [search, setSearch] = useState('')
  const [selectedCellId, setSelectedCellId] = useState('')
  const [patronId, setPatronId] = useState<PatronId | null>(null)
  const [name, setName] = useState('')
  const [step, setStep] = useState<'cell' | 'patron' | 'name'>('cell')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    if (!search) return cells.slice(0, 50)
    const q = search.toLowerCase()
    return cells
      .filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .slice(0, 50)
  }, [cells, search])

  const selectedCell = cells.find(c => c.id === selectedCellId)

  const handleSubmit = async () => {
    if (!selectedCellId || !patronId || !name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const cultist = await game.register(name.trim(), selectedCellId, patronId)
      onRegistered(cultist)
    } catch {
      setError('The rite would not take. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)',
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.4s ease-out',
    }}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 32, width: 420, maxWidth: '90vw',
        maxHeight: '82vh', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontSize: 20, textAlign: 'center', letterSpacing: 3 }}>
          FHTAGN
        </h2>

        {step === 'cell' && (
          <>
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', fontSize: 14 }}>
              Where will your cell take root?
            </p>
            <input
              type="text"
              placeholder="Search cities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={inputStyle}
            />
            <div style={{ overflowY: 'auto', maxHeight: 280, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.map(cell => (
                <button
                  key={cell.id}
                  onClick={() => { setSelectedCellId(cell.id); setStep('patron') }}
                  style={listButtonStyle(cell.id === selectedCellId)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = cell.id === selectedCellId ? 'rgba(31,158,143,0.15)' : 'transparent')}
                >
                  {cell.name}, <span style={{ color: 'var(--text-dim)' }}>{cell.country}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'patron' && (
          <>
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', fontSize: 14 }}>
              Whom does <span style={{ color: 'var(--gold)' }}>{selectedCell?.name}</span> serve?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 320 }}>
              {PATRONS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPatronId(p.id); setStep('name') }}
                  style={{
                    textAlign: 'left', background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${patronId === p.id ? p.color : 'var(--border)'}`,
                    borderRadius: 10, padding: '10px 12px', cursor: 'pointer', color: 'var(--text)',
                  }}
                >
                  <div style={{ fontWeight: 600, color: p.color, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{p.domain}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    <span style={{ color: 'var(--teal)' }}>＋ {p.boon}</span><br />
                    <span style={{ color: 'var(--crimson)' }}>－ {p.drawback}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('cell')} style={backButtonStyle}>Back</button>
          </>
        )}

        {step === 'name' && (
          <>
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', fontSize: 14 }}>
              A cell in <span style={{ color: 'var(--gold)' }}>{selectedCell?.name}</span>. What name will the faithful whisper?
            </p>
            <input
              type="text"
              placeholder="Your name among the cult"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
            />
            {error && <p style={{ color: 'var(--crimson)', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('patron')} style={{ ...backButtonStyle, flex: 1 }}>Back</button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || submitting}
                style={{
                  flex: 2, background: 'var(--gold)', border: 'none', borderRadius: 8,
                  padding: '10px 0', color: '#000', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14,
                  opacity: !name.trim() || submitting ? 0.5 : 1,
                }}
              >
                {submitting ? 'Founding…' : 'Found the cell'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 14px', color: 'var(--text)',
  fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none',
}

function listButtonStyle(selected: boolean): React.CSSProperties {
  return {
    background: selected ? 'rgba(31,158,143,0.15)' : 'transparent',
    border: 'none', borderRadius: 6, padding: '8px 12px',
    color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'var(--font-sans)', fontSize: 14, transition: 'background 0.15s',
  }
}

const backButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 0', color: 'var(--text-dim)',
  cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14,
}
