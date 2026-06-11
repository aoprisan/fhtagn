import { useEffect } from 'react'

// The grimoire: a full-screen rules screen reachable any time from the Rules
// button. A plain-spoken digest of the core loop and the systems around it
// (spec §3) — enough to play without reading the design doc. Themed to match
// the Onboarding modal so the two read as one ritual interface.

interface RulesScreenProps {
  onClose: () => void
}

interface Rule {
  glyph: string
  title: string
  body: string
  color: string
}

const LOOP: Rule[] = [
  {
    glyph: '☩',
    title: 'Chant',
    color: 'var(--teal)',
    body:
      'Tap or hold the orb to gather devotion for your cell. Cheap, fast, endless — ' +
      'the heartbeat of the cult. Chant in fast bursts and the faithful take notice.',
  },
  {
    glyph: '⚚',
    title: 'The Liturgy',
    color: 'var(--gold)',
    body:
      'Devotion is a currency, not just a score. Spend it on followers (devotion per ' +
      'second) and litanies (each doubles your chant). Costs climb, but the numbers ' +
      'compound — followers persist when the world reseeds, a light prestige each cycle.',
  },
  {
    glyph: '✶',
    title: 'Rites & Sigils',
    color: 'var(--crimson)',
    body:
      'Invoke a Rite on a rival cell by tracing its sigil — a faltered sigil costs ' +
      'nothing. A share of what the Rite tears loose is harvested back into your own ' +
      'cell. Your tier sets how ornate the sigils grow.',
  },
  {
    glyph: '◈',
    title: 'Spread the Word',
    color: 'var(--teal)',
    body:
      'Carry the word to a nearby cell — convert the uncommitted, or flip a rival you ' +
      'overpower. Spread widens your Reach and uncovers Lore. Three leaderboards rank ' +
      'Devotion, Reach, and Lore.',
  },
  {
    glyph: '☾',
    title: 'Sanity & the Veil',
    color: 'var(--violet)',
    body:
      'Forbidden power frays the mind, and a frayed mind pays: every devotion gain ' +
      'multiplies as sanity falls. But below 40 the flock bleeds, below 25 followers ' +
      'defect, and at the brink your patron’s lethal attention falls. The Rite of ' +
      'Lucidity buys sanity back — for a tithe of your cell’s devotion.',
  },
  {
    glyph: '✷',
    title: 'The Roil',
    color: 'var(--violet)',
    body:
      'Azathoth’s blind churn strikes cells at random. Tend your Wards to lower the ' +
      'odds and blunt the blow — never to zero, and they erode unless tended.',
  },
  {
    glyph: '⛧',
    title: 'Bargains',
    color: 'var(--crimson)',
    body:
      'Nyarlathotep, the Tempter, offers pacts — more often as your mind frays. The ' +
      'grant and the sanity cost are shown; the catch is hidden, and springs later. ' +
      'Court him yourself, or wait to be courted. A genuine gamble, not a known trade.',
  },
  {
    glyph: '✦',
    title: 'The Awakening',
    color: 'var(--gold)',
    body:
      'As cults amass their Great Work, the Convergence climbs. When the stars are ' +
      'right, the first cult to perform the Great Rite wakes its god — the world ' +
      'reseeds and a new Cycle begins. Dawdle, and a rival wakes theirs first.',
  },
]

const TIERS = [
  { name: 'Witness', note: 'You watch the world chant. Found a cell to begin.' },
  { name: 'Initiate', note: 'You hold a cell — chant, spend the Liturgy, spread the word.' },
  { name: 'High Priest', note: 'The full grimoire: rites, deeper pacts, the Great Rite.' },
]

export default function RulesScreen({ onClose }: RulesScreenProps) {
  // Esc closes the grimoire, like any modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to play FHTAGN"
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 110,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, rgba(8,15,18,0.96), rgba(3,6,11,0.98))',
          border: '1px solid var(--border-strong)',
          borderRadius: 6, padding: 28, width: 520, maxWidth: '94vw',
          maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 24px 70px -16px rgba(0,0,0,0.85), inset 0 1px 0 rgba(70,230,205,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--text)',
            fontSize: 26, letterSpacing: 4, textShadow: '0 0 24px rgba(43,191,168,0.45)',
          }}>
            THE GRIMOIRE
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
              width: 30, height: 30, color: 'var(--text-dim)', cursor: 'pointer',
              fontSize: 16, lineHeight: 1, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: 'var(--text-dim)', fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 }}>
          Found a cult cell in a real city, chant to gather devotion, trace sigils to invoke
          eldritch rites, and race rival cults to wake a sleeping god — while the indifferent
          cosmos strikes at random.
        </p>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
          <span className="eyebrow" style={{ fontSize: 12, color: 'var(--teal)' }}>The Loop</span>
          {LOOP.map(r => (
            <div key={r.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                flexShrink: 0, width: 30, textAlign: 'center', fontSize: 20, color: r.color,
                textShadow: `0 0 12px ${r.color}`, marginTop: 1,
              }} aria-hidden>
                {r.glyph}
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: r.color, letterSpacing: 0.5 }}>
                  {r.title}
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5, marginTop: 2 }}>
                  {r.body}
                </p>
              </div>
            </div>
          ))}

          <span className="eyebrow" style={{ fontSize: 12, color: 'var(--teal)', marginTop: 4 }}>The Tiers</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TIERS.map(t => (
              <div key={t.name} style={{ display: 'flex', gap: 10, fontSize: 12.5 }}>
                <span style={{ flexShrink: 0, width: 96, color: 'var(--gold)', fontWeight: 600 }}>{t.name}</span>
                <span style={{ color: 'var(--text-dim)', lineHeight: 1.45 }}>{t.note}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 2, background: 'var(--gold)', border: 'none', borderRadius: 8,
            padding: '11px 0', color: '#000', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14,
          }}
        >
          The stars are right
        </button>
      </div>
    </div>
  )
}
