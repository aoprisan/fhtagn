import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Globe from './components/Globe'
import Onboarding from './components/Onboarding'
import ChantButton from './components/ChantButton'
import InfoPanel from './components/InfoPanel'
import Leaderboard from './components/Leaderboard'
import WorldPanel from './components/WorldPanel'
import ConnectionStatus from './components/ConnectionStatus'
import ToastSystem, { useToasts } from './components/ToastSystem'
import CultistPanel from './components/CultistPanel'
import RitePanel from './components/RitePanel'
import PactPanel from './components/PactPanel'
import ErrorBoundary from './components/ErrorBoundary'
import SigilCanvas from './components/SigilCanvas'
import SanityMeter from './components/SanityMeter'
import TempterCard from './components/TempterCard'
import PwaPrompts from './components/PwaPrompts'
import { game } from './client'
import { useGameClient } from './hooks/useGameClient'
import { useChantHandler } from './hooks/useChantHandler'
import type {
  Cell, Cultist, CellUpdate, RiteStrike, IndifferenceStrike,
  RevelationEarned, WorldStats, Rite, Bargain, BargainSprung,
} from './types'

const LEADERBOARD_REFRESH_MS = 3000

export default function App() {
  const [cells, setCells] = useState<Cell[]>([])
  const [cultist, setCultist] = useState<Cultist | null>(null)
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null)
  const [loading, setLoading] = useState(true)
  const [pulsingCellId, setPulsingCellId] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<Cell[]>([])
  const [onboardingState, setOnboardingState] = useState<'hidden' | 'visible' | 'fading'>('hidden')
  const [worldStats, setWorldStats] = useState<WorldStats | null>(null)
  const [riteRefreshKey, setRiteRefreshKey] = useState(0)
  const [targetingRite, setTargetingRite] = useState<Rite | null>(null)
  const [pendingCast, setPendingCast] = useState<{ rite: Rite; cell: Cell } | null>(null)
  const [sanity, setSanity] = useState(100)
  const [hallucinating, setHallucinating] = useState(false)
  const [bargain, setBargain] = useState<Bargain | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const hallucinateTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const leaderboardTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const { toasts, addToast } = useToasts()

  const tier = cultist?.tier ?? 'witness'

  // Track the viewport so the grimoire dock/sheet replaces floating panels on phones.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Load the world + any saved cultist
  useEffect(() => {
    Promise.all([game.listCells(), game.me(), game.leaderboard('devotion', 10), game.stats(), game.currentBargain()])
      .then(([cellsData, cultistData, leaderboardData, statsData, standingBargain]) => {
        setCells(cellsData)
        setLeaderboard(leaderboardData)
        setWorldStats(statsData)
        setBargain(standingBargain)
        if (cultistData) {
          setCultist(cultistData)
          setSanity(cultistData.sanity)
          const home = cellsData.find(c => c.id === cultistData.cellId)
          if (home) setSelectedCell(home)
        } else if (leaderboardData.length > 0) {
          const top = cellsData.find(c => c.id === leaderboardData[0].id)
          if (top) setSelectedCell(top)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => () => clearTimeout(leaderboardTimer.current), [])

  const refreshLeaderboard = useCallback(() => {
    if (leaderboardTimer.current) return
    leaderboardTimer.current = setTimeout(() => {
      game.leaderboard('devotion', 10).then(setLeaderboard).catch(() => {})
      game.stats().then(setWorldStats).catch(() => {})
      leaderboardTimer.current = undefined
    }, LEADERBOARD_REFRESH_MS)
  }, [])

  const reconcileRef = useRef<(serverTotal: number) => void>(() => {})

  const onCellUpdate = useCallback((update: CellUpdate) => {
    setCells(prev =>
      prev.map(c =>
        c.id === update.cellId
          ? { ...c, devotion: update.devotion, contributorCount: update.contributorCount, peakDevotion: update.peakDevotion }
          : c
      )
    )
    setSelectedCell(prev =>
      prev && prev.id === update.cellId
        ? { ...prev, devotion: update.devotion, contributorCount: update.contributorCount, peakDevotion: update.peakDevotion }
        : prev
    )
    if (cultist && update.cellId === cultist.cellId) {
      reconcileRef.current(update.devotion)
    }
    setPulsingCellId(update.cellId)
    setTimeout(() => setPulsingCellId(null), 1500)
    refreshLeaderboard()
  }, [refreshLeaderboard, cultist])

  const cellsRef = useRef(cells)
  cellsRef.current = cells

  const onRiteStrike = useCallback((strike: RiteStrike) => {
    if (cultist && strike.targetCellId === cultist.cellId) {
      addToast(`${strike.damage.toLocaleString()} devotion torn from your cell by ${strike.casterCellName}`, 'rite_incoming')
    } else {
      const target = cellsRef.current.find(c => c.id === strike.targetCellId)
      addToast(`${strike.riteType} claims ${strike.damage.toLocaleString()} in ${target?.name ?? 'a distant cell'}`, 'rite')
    }
    setPulsingCellId(strike.targetCellId)
    setTimeout(() => setPulsingCellId(null), 1500)
  }, [cultist, addToast])

  const onRiteIncoming = useCallback((strike: RiteStrike) => {
    // May be a hallucination at low sanity (damage 0) — indistinguishable by design.
    if (cultist && strike.targetCellId === cultist.cellId) {
      addToast(`Something reaches toward your cell from ${strike.casterCellName}…`, 'rite_incoming')
    }
  }, [cultist, addToast])

  const onIndifference = useCallback((s: IndifferenceStrike) => {
    const target = cellsRef.current.find(c => c.id === s.targetCellId)
    addToast(`The Indifference falls on ${target?.name ?? 'somewhere'} — ${s.damage.toLocaleString()} lost`, 'indifference')
    setPulsingCellId(s.targetCellId)
    setTimeout(() => setPulsingCellId(null), 1500)
  }, [addToast])

  const onRevelation = useCallback((data: RevelationEarned) => {
    let msg = `Revelation: ${data.revelationName}`
    if (data.riteType) msg += ` — the ${data.riteType} is yours to trace`
    addToast(msg, 'revelation')
    setRiteRefreshKey(k => k + 1)
  }, [addToast])

  const onSanity = useCallback((data: { sanity: number; hallucination?: boolean }) => {
    setSanity(data.sanity)
    setCultist(prev => prev ? { ...prev, sanity: data.sanity } : prev)
    if (data.hallucination) {
      setHallucinating(true)
      clearTimeout(hallucinateTimer.current)
      hallucinateTimer.current = setTimeout(() => setHallucinating(false), 1200)
    }
  }, [])

  useEffect(() => () => clearTimeout(hallucinateTimer.current), [])

  const onBargainOffer = useCallback((b: Bargain) => {
    setBargain(b)
    addToast('A bargain is offered. The Crawling Chaos awaits your answer.', 'bargain')
  }, [addToast])

  const onBargainSprung = useCallback((s: BargainSprung) => {
    addToast(s.message, s.sprung ? 'rite_incoming' : 'bargain')
  }, [addToast])

  const { connectionState } = useGameClient({
    onCellUpdate, onRiteStrike, onRiteIncoming, onIndifference, onRevelation, onSanity,
    onBargainOffer, onBargainSprung,
  })

  const handleLucidity = useCallback(() => game.riteOfLucidity(), [])
  const handleCourt = useCallback(() => {
    addToast('You speak into the dark, and the dark leans closer…', 'bargain')
    game.courtTempter()
  }, [addToast])

  const handleAcceptBargain = useCallback(async (id: string) => {
    setBargain(null)
    try {
      const { granted } = await game.acceptBargain(id)
      addToast(`The pact is sealed — you take ${granted}. Something of you is now owed.`, 'bargain')
      setRiteRefreshKey(k => k + 1)
    } catch (e) {
      addToast(`The bargain slips away: ${e instanceof Error ? e.message : 'unknown'}`, 'bargain')
    }
  }, [addToast])

  const handleDeclineBargain = useCallback((id: string) => {
    setBargain(null)
    game.declineBargain(id)
  }, [])

  const { handleChant, personalChants, rateLimited, multiplier, reconcile } = useChantHandler(
    cultist,
    () => {
      if (cultist) {
        const mult = tier === 'highPriest' ? 2 : 1
        setCells(prev => prev.map(c => c.id === cultist.cellId ? { ...c, devotion: c.devotion + mult } : c))
      }
    },
  )
  reconcileRef.current = reconcile

  // A matched sigil completes the rite chosen during targeting (spec §4).
  const castPendingRite = useCallback(async () => {
    if (!pendingCast) return
    const { rite, cell } = pendingCast
    setPendingCast(null)
    try {
      const result = await game.invokeRite(rite.id, cell.id)
      addToast(`${result.riteType} claims ${result.damage.toLocaleString()} devotion in ${result.targetCellName}`, 'rite')
      setRiteRefreshKey(k => k + 1)
    } catch (e) {
      addToast(`The rite fails: ${e instanceof Error ? e.message : 'unknown'}`, 'rite')
    }
  }, [pendingCast, addToast])

  const handleCellSelect = useCallback((cell: Cell) => {
    if (targetingRite) {
      // Target chosen — now the sigil must be traced to invoke.
      setPendingCast({ rite: targetingRite, cell })
      setTargetingRite(null)
      return
    }
    setSelectedCell(cell)
    // On phones, surface the cell's grimoire page when a city is chosen.
    if (window.matchMedia('(max-width: 768px)').matches) setActiveTab('cell')
  }, [targetingRite])

  const handleInvokeRite = useCallback((rite: Rite) => {
    setTargetingRite(rite)
    addToast(`Choose a cell within ${rite.rangeKm}km to receive the ${rite.riteType}`, 'rite')
  }, [addToast])

  const handleRegistered = useCallback((newCultist: Cultist) => {
    setCultist(newCultist)
    setSanity(newCultist.sanity)
    const home = cells.find(c => c.id === newCultist.cellId)
    if (home) setSelectedCell(home)
    setOnboardingState('fading')
    setTimeout(() => setOnboardingState('hidden'), 400)
  }, [cells])

  const handleAscended = useCallback(() => {
    game.me().then(c => { if (c) setCultist(c) }).catch(() => {})
  }, [])

  const handleWitnessJoin = useCallback(() => setOnboardingState('visible'), [])

  const userCell = cultist ? cells.find(c => c.id === cultist.cellId) : null
  const totalDevotion = useMemo(() => cells.reduce((sum, c) => sum + c.devotion, 0), [cells])
  const selectedRank = selectedCell ? leaderboard.findIndex(c => c.id === selectedCell.id) + 1 : 0

  if (loading) {
    return (
      <>
        <div className="fog" aria-hidden><span /><span /><span /></div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, height: '100vh', position: 'relative', zIndex: 10,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, letterSpacing: 8,
            color: 'var(--text)', textShadow: '0 0 30px rgba(43,191,168,0.5)',
            animation: 'flicker 6s ease-in-out infinite',
          }}>
            FHTAGN
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-dim)', letterSpacing: 1 }}>
            the stars are right…
          </div>
        </div>
      </>
    )
  }

  // Secondary panels — rendered around the edges on desktop, or inside the
  // mobile grimoire sheet (one at a time, chosen from the rune dock).
  const infoPanelEl = selectedCell && (
    <InfoPanel
      cell={selectedCell}
      isHome={cultist ? selectedCell.id === cultist.cellId : false}
      userDevotion={cultist && selectedCell.id === cultist.cellId ? personalChants : undefined}
      rank={selectedRank}
    />
  )
  const cultistPanelEl = cultist && (
    <CultistPanel cultist={cultist} personalChants={personalChants} cellName={userCell?.name} />
  )
  const ritePanelEl = <RitePanel tier={tier} onInvokeRite={handleInvokeRite} refreshKey={riteRefreshKey} />
  const pactPanelEl = <PactPanel tier={tier} onAscended={handleAscended} />
  const sanityPanelEl = cultist && (
    <SanityMeter sanity={sanity} hallucinating={hallucinating} onLucidity={handleLucidity} onCourt={handleCourt} />
  )
  const leaderboardEl = <Leaderboard cells={leaderboard} />

  const dockTabs = [
    infoPanelEl && { key: 'cell', glyph: '◈', cap: 'Cell', el: infoPanelEl },
    cultistPanelEl && { key: 'you', glyph: '☩', cap: 'You', el: cultistPanelEl },
    cultist && tier !== 'witness' && { key: 'rites', glyph: '✶', cap: 'Rites', el: ritePanelEl },
    sanityPanelEl && { key: 'mind', glyph: '☾', cap: 'Mind', el: sanityPanelEl },
    cultist && tier !== 'witness' && { key: 'pact', glyph: '⛧', cap: 'Pact', el: pactPanelEl },
    { key: 'ranks', glyph: '♆', cap: 'Ranks', el: leaderboardEl },
  ].filter(Boolean) as { key: string; glyph: string; cap: string; el: React.ReactNode }[]

  const activeSheet = isMobile ? dockTabs.find(t => t.key === activeTab) : null

  return (
    <>
      <div className="fog" aria-hidden><span /><span /><span /></div>

      <ErrorBoundary>
        <Globe
          cells={cells}
          userCellId={cultist?.cellId ?? null}
          onCellClick={handleCellSelect}
          selectedCellId={selectedCell?.id ?? null}
          pulsingCellId={pulsingCellId}
          paused={!!targetingRite}
        />
      </ErrorBoundary>

      {cultist && sanity < 50 && (
        <div
          aria-hidden
          style={{
            position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none',
            boxShadow: `inset 0 0 ${120 + (50 - sanity) * 6}px ${40 + (50 - sanity)}px rgba(207, 53, 80, ${((50 - sanity) / 50) * (hallucinating ? 0.55 : 0.32)})`,
            transition: 'box-shadow 0.4s ease',
            filter: hallucinating ? 'saturate(1.4)' : 'none',
          }}
        />
      )}

      <div className="logo">FHTAGN</div>

      <WorldPanel stats={worldStats} totalDevotion={totalDevotion} />

      <ToastSystem toasts={toasts} />

      <PwaPrompts />

      {/* Desktop: panels float around the edges. Mobile: the rune dock + sheet below. */}
      {!isMobile && (
        <>
          {leaderboardEl}
          {infoPanelEl}
          {cultistPanelEl}
          {ritePanelEl}
          {pactPanelEl}
          {sanityPanelEl}
        </>
      )}

      {isMobile && (
        <>
          {activeSheet && <div className="sheet" key={activeSheet.key}>{activeSheet.el}</div>}
          <nav className="dock">
            {dockTabs.map(t => (
              <button
                key={t.key}
                className={`dock-tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(a => (a === t.key ? null : t.key))}
              >
                <span className="glyph">{t.glyph}</span>
                <span className="cap">{t.cap}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      {/* The orb steps aside while a grimoire sheet is open so it never
          overlaps the drawer; the dock + sheet own the bottom band then. */}
      {!(isMobile && activeSheet) && (
        <ChantButton
          onChant={tier === 'witness' ? handleWitnessJoin : handleChant}
          personalChants={cultist ? personalChants : 0}
          cellName={userCell?.name}
          rateLimited={rateLimited}
          tier={tier}
          multiplier={multiplier}
        />
      )}

      <ConnectionStatus state={connectionState} />

      {onboardingState !== 'hidden' && (
        <Onboarding
          cells={cells}
          onRegistered={handleRegistered}
          fading={onboardingState === 'fading'}
        />
      )}

      {pendingCast && (
        <SigilCanvas
          rite={pendingCast.rite}
          targetCellName={pendingCast.cell.name}
          onMatch={castPendingRite}
          onCancel={() => setPendingCast(null)}
        />
      )}

      {targetingRite && (
        <div className="targeting-overlay" style={{
          position: 'absolute', bottom: 160, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, background: 'rgba(201, 48, 74, 0.2)', border: '1px solid rgba(201, 48, 74, 0.4)',
          borderRadius: 8, padding: '8px 16px', fontSize: 12, color: 'var(--crimson)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span>Tracing: {targetingRite.riteType} ({targetingRite.rangeKm}km)</span>
          <button
            onClick={() => setTargetingRite(null)}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4, padding: '2px 8px', color: 'var(--text)', cursor: 'pointer', fontSize: 11,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {bargain && cultist && (
        <TempterCard
          bargain={bargain}
          onAccept={handleAcceptBargain}
          onDecline={handleDeclineBargain}
        />
      )}
    </>
  )
}
