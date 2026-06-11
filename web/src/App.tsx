import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
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
import AwakeningPanel from './components/AwakeningPanel'
import LiturgyPanel from './components/LiturgyPanel'
import PwaPrompts from './components/PwaPrompts'
import { game } from './client'
import { PATRON_BY_ID, patronMods } from './game/catalog'
import { canConvert, SPREAD_RANGE_KM } from './game/awakening'
import { veilMultiplier, lucidityTithe } from './game/liturgy'
import { haversineKm } from './game/geo'
import { useGameClient } from './hooks/useGameClient'
import { useChantHandler } from './hooks/useChantHandler'
import type {
  Cell, Cultist, CellUpdate, RiteStrike, RoilStrike,
  RevelationEarned, WorldStats, Rite, Bargain, BargainSprung, MadnessToll,
  CellConverted, AwakeningState, AwakeningTriggered,
} from './types'

const LEADERBOARD_REFRESH_MS = 3000
const Globe = lazy(() => import('./components/Globe'))

// The Great Rite is traced as the Unmaking (the cataclysm sigil) — the most
// ornate sigil, fitting the culmination of a whole cycle (spec §4, §9).
const GREAT_RITE_SIGIL: Rite = {
  id: 'great-rite', cultistId: '', riteType: 'The Great Rite', family: 'cataclysm',
  tier: 3, source: 'awakening', rangeKm: 0, damageLower: 0, damageUpper: 0,
  invoked: false, devotionClaimed: 0,
}

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
  const [awakening, setAwakening] = useState<AwakeningState | null>(null)
  const [lbVersion, setLbVersion] = useState(0)
  const [spreading, setSpreading] = useState(false)
  const [greatRiteTracing, setGreatRiteTracing] = useState(false)
  const [awakeningFlash, setAwakeningFlash] = useState(false)
  const awakeningFlashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [roilStrike, setRoilStrike] = useState<{ lat: number; lng: number; key: number } | null>(null)
  const [roilFlash, setRoilFlash] = useState(false)
  const roilKey = useRef(0)
  const roilFlashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
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
    Promise.all([
      game.listCells(), game.me(), game.leaderboard('devotion', 10), game.stats(),
      game.currentBargain(), game.awakeningState(),
    ])
      .then(([cellsData, cultistData, leaderboardData, statsData, standingBargain, awakeningData]) => {
        setCells(cellsData)
        setLeaderboard(leaderboardData)
        setWorldStats(statsData)
        setBargain(standingBargain)
        setAwakening(awakeningData)
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
      game.awakeningState().then(setAwakening).catch(() => {})
      setLbVersion(v => v + 1)   // nudge the Leaderboard to refetch its active board
      leaderboardTimer.current = undefined
    }, LEADERBOARD_REFRESH_MS)
  }, [])

  const onCellUpdate = useCallback((update: CellUpdate) => {
    const merge = (c: Cell): Cell => ({
      ...c,
      devotion: update.devotion,
      contributorCount: update.contributorCount,
      peakDevotion: update.peakDevotion,
      wardLevel: update.wardLevel ?? c.wardLevel,
      reach: update.reach ?? c.reach,
      lore: update.lore ?? c.lore,
    })
    setCells(prev => prev.map(c => (c.id === update.cellId ? merge(c) : c)))
    setSelectedCell(prev => (prev && prev.id === update.cellId ? merge(prev) : prev))
    setPulsingCellId(update.cellId)
    setTimeout(() => setPulsingCellId(null), 1500)
    refreshLeaderboard()
  }, [refreshLeaderboard])

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

  const onRoil = useCallback((s: RoilStrike) => {
    const target = cellsRef.current.find(c => c.id === s.targetCellId)
    const where = target?.name ?? 'somewhere'
    const msg = s.warded
      ? `The Roil breaks over ${where} — the wards hold, ${s.damage.toLocaleString()} still lost`
      : `The Roil falls on ${where} — ${s.damage.toLocaleString()} lost`
    addToast(msg, 'roil')
    // The Roil owns its own visual: a violet beam + shockwave on the globe and a
    // brief flash of the void, distinct from the teal pulse of a rite.
    setRoilStrike({ lat: s.toLat, lng: s.toLng, key: ++roilKey.current })
    setRoilFlash(true)
    clearTimeout(roilFlashTimer.current)
    roilFlashTimer.current = setTimeout(() => setRoilFlash(false), 480)
  }, [addToast])

  useEffect(() => () => clearTimeout(roilFlashTimer.current), [])

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

  // The interface itself frays with the cultist's mind: panels breathe out of
  // focus, headings split chromatically. Driven by body classes so it reaches
  // every panel without threading sanity through each component.
  useEffect(() => {
    const all = ['mind-fraying', 'mind-slipping', 'mind-unravelled']
    document.body.classList.remove(...all)
    if (cultist) {
      const cls = sanity <= 15 ? 'mind-unravelled' : sanity <= 35 ? 'mind-slipping' : sanity <= 55 ? 'mind-fraying' : null
      if (cls) document.body.classList.add(cls)
    }
    return () => document.body.classList.remove(...all)
  }, [sanity, cultist])

  const onMadnessToll = useCallback((t: MadnessToll) => {
    addToast(t.message, 'rite_incoming')
  }, [addToast])

  const onBargainOffer = useCallback((b: Bargain) => {
    setBargain(b)
    addToast('A bargain is offered. The Crawling Chaos awaits your answer.', 'bargain')
  }, [addToast])

  const onBargainSprung = useCallback((s: BargainSprung) => {
    addToast(s.message, s.sprung ? 'rite_incoming' : 'bargain')
  }, [addToast])

  const onCellConverted = useCallback((c: CellConverted) => {
    // Only surface conversions that touch the player — yours, or one of yours flipped away.
    if (cultist && c.byCellName && c.toPatronId === cultist.patronId) {
      const verb = c.fromPatronId ? 'flips to' : 'takes up'
      addToast(`${c.cellName} ${verb} your patron — the word spreads`, 'convert')
    }
    refreshLeaderboard()
  }, [cultist, addToast, refreshLeaderboard])

  const onAwakeningProgress = useCallback(() => {
    // The telegraph fires only on meaningful shifts; pull the full state for the panel.
    game.awakeningState().then(setAwakening).catch(() => {})
  }, [])

  const reloadWorld = useCallback(() => {
    Promise.all([game.listCells(), game.me(), game.leaderboard('devotion', 10), game.stats(), game.awakeningState()])
      .then(([cellsData, cultistData, lb, statsData, awakeningData]) => {
        setCells(cellsData)
        setLeaderboard(lb)
        setWorldStats(statsData)
        setAwakening(awakeningData)
        setLbVersion(v => v + 1)
        if (cultistData) {
          setCultist(cultistData)
          const home = cellsData.find(c => c.id === cultistData.cellId)
          setSelectedCell(home ?? null)
        }
      })
      .catch(() => {})
  }, [])

  const onAwakeningTriggered = useCallback((a: AwakeningTriggered) => {
    const patron = PATRON_BY_ID[a.patronId]
    addToast(
      a.byYou
        ? `THE GREAT RITE IS COMPLETE. ${patron.name} wakes at your call — the world unmakes. Cycle ${a.season} begins.`
        : `${a.cellName} completes the Great Rite. ${patron.name} wakes, and the world is remade. Cycle ${a.season} begins.`,
      'awakening',
    )
    // The world reseeds: clear any in-flight targeting and reload from the fresh map.
    setTargetingRite(null); setSpreading(false); setPendingCast(null); setGreatRiteTracing(false)
    setAwakeningFlash(true)
    clearTimeout(awakeningFlashTimer.current)
    awakeningFlashTimer.current = setTimeout(() => setAwakeningFlash(false), 1100)
    reloadWorld()
  }, [addToast, reloadWorld])

  useEffect(() => () => clearTimeout(awakeningFlashTimer.current), [])

  const { connectionState } = useGameClient({
    onCellUpdate, onRiteStrike, onRiteIncoming, onRoil, onRevelation, onSanity, onMadnessToll,
    onBargainOffer, onBargainSprung, onCellConverted, onAwakeningProgress, onAwakeningTriggered,
  })

  const handleLucidity = useCallback(() => {
    const r = game.riteOfLucidity()
    if (r.ok) addToast(`A tithe of ${r.tithe.toLocaleString()} devotion buys back ${r.restored} sanity.`, 'revelation')
    else addToast(`The rite of lucidity falters: ${r.reason ?? 'unknown'}.`, 'rite')
  }, [addToast])
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

  const { handleChant, personalChants, rateLimited, multiplier } = useChantHandler(
    cultist,
    () => {
      if (cultist) {
        const power = Math.max(1, game.chantPower())
        setCells(prev => prev.map(c => c.id === cultist.cellId ? { ...c, devotion: c.devotion + power } : c))
      }
    },
  )

  // A matched sigil completes the rite chosen during targeting (spec §4).
  const castPendingRite = useCallback(async () => {
    if (!pendingCast) return
    const { rite, cell } = pendingCast
    setPendingCast(null)
    try {
      const result = await game.invokeRite(rite.id, cell.id)
      addToast(
        `${result.riteType} claims ${result.damage.toLocaleString()} devotion in ${result.targetCellName}` +
        (result.harvest > 0 ? ` — ${result.harvest.toLocaleString()} souls feed your cell` : ''),
        'rite',
      )
      setRiteRefreshKey(k => k + 1)
    } catch (e) {
      addToast(`The rite fails: ${e instanceof Error ? e.message : 'unknown'}`, 'rite')
    }
  }, [pendingCast, addToast])

  const handleCellSelect = useCallback((cell: Cell) => {
    if (targetingRite) {
      const home = cultist ? cellsRef.current.find(c => c.id === cultist.cellId) : null
      if (!home) return
      if (cell.id === home.id) {
        addToast('The rite needs a rival or distant victim, not your own altar.', 'rite')
        return
      }
      const dist = haversineKm(home.lat, home.lng, cell.lat, cell.lng)
      if (dist > targetingRite.rangeKm) {
        addToast(`Too far for this rite: ${Math.round(dist).toLocaleString()}km > ${targetingRite.rangeKm.toLocaleString()}km.`, 'rite')
        return
      }
      // Target chosen — now the sigil must be traced to invoke.
      setPendingCast({ rite: targetingRite, cell })
      setTargetingRite(null)
      return
    }
    if (spreading) {
      const home = cultist ? cellsRef.current.find(c => c.id === cultist.cellId) : null
      if (!home) return
      const check = canConvert(home, cell, cultist?.patronId ?? null)
      if (!check.ok) {
        addToast(check.reason ?? 'The word will not carry there.', 'convert')
        return
      }
      // Target chosen for conversion — carry the word there at once (no sigil; spread is core, low-friction).
      setSpreading(false)
      game.convert(cell.id)
        .then(r => addToast(`The word reaches ${r.cellName} — it is yours. Your reach is now ${r.reach}.`, 'convert'))
        .catch(e => addToast(`The word does not carry: ${e instanceof Error ? e.message : 'unknown'}`, 'convert'))
      return
    }
    setSelectedCell(cell)
    // On phones, surface the cell's grimoire page when a city is chosen.
    if (window.matchMedia('(max-width: 768px)').matches) setActiveTab('cell')
  }, [targetingRite, spreading, cultist, addToast])

  const handleInvokeRite = useCallback((rite: Rite) => {
    setTargetingRite(rite)
    addToast(`Choose a cell within ${rite.rangeKm}km to receive the ${rite.riteType}`, 'rite')
  }, [addToast])

  const handleSpread = useCallback(() => {
    setTargetingRite(null)
    setSpreading(true)
    addToast('Choose a nearby cell to carry the word to — the uncommitted, or a rival you overpower.', 'convert')
  }, [addToast])

  const handleGreatRite = useCallback(() => {
    if (!awakening?.aligned || !awakening.homeQualifies) return
    setGreatRiteTracing(true)
  }, [awakening])

  const castGreatRite = useCallback(async () => {
    setGreatRiteTracing(false)
    try {
      await game.greatRite()
      // The awakening_triggered event drives the toast, flash, and world reseed.
    } catch (e) {
      addToast(`The Great Rite falters: ${e instanceof Error ? e.message : 'unknown'}`, 'awakening')
    }
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
  const targetStatus = useCallback((cell: Cell) => {
    if (!userCell || (!targetingRite && !spreading)) return null
    if (cell.id === userCell.id) return 'home'
    if (targetingRite) {
      return haversineKm(userCell.lat, userCell.lng, cell.lat, cell.lng) <= targetingRite.rangeKm
        ? 'valid'
        : 'invalid'
    }
    const check = canConvert(userCell, cell, cultist?.patronId ?? null)
    return check.ok ? 'valid' : 'invalid'
  }, [userCell, targetingRite, spreading, cultist?.patronId])

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
  const isHomeSelected = cultist ? selectedCell?.id === cultist.cellId : false
  const infoPanelEl = selectedCell && (
    <InfoPanel
      cell={selectedCell}
      isHome={isHomeSelected}
      userDevotion={cultist && selectedCell.id === cultist.cellId ? personalChants : undefined}
      rank={selectedRank}
      onSpread={isHomeSelected && tier !== 'witness' ? handleSpread : undefined}
    />
  )
  const cultistPanelEl = cultist && (
    <CultistPanel cultist={cultist} personalChants={personalChants} cellName={userCell?.name} />
  )
  const ritePanelEl = <RitePanel tier={tier} onInvokeRite={handleInvokeRite} refreshKey={riteRefreshKey} />
  const pactPanelEl = <PactPanel tier={tier} onAscended={handleAscended} />
  const veil = cultist ? veilMultiplier(sanity, patronMods(cultist.patronId).madnessSlope) : 1
  const titheLabel = `${lucidityTithe(userCell?.devotion ?? 0).toLocaleString()} devotion`
  const sanityPanelEl = cultist && (
    <SanityMeter
      sanity={sanity} hallucinating={hallucinating} veil={veil} titheLabel={titheLabel}
      onLucidity={handleLucidity} onCourt={handleCourt}
    />
  )
  const liturgyPanelEl = cultist && tier !== 'witness' && (
    <LiturgyPanel cultist={cultist} homeDevotion={userCell?.devotion ?? 0} />
  )
  const awakeningPanelEl = (
    <AwakeningPanel state={awakening} canAct={!!cultist && tier !== 'witness'} onGreatRite={handleGreatRite} />
  )
  const leaderboardEl = <Leaderboard version={lbVersion} />

  const dockTabs = [
    infoPanelEl && { key: 'cell', glyph: '◈', cap: 'Cell', el: infoPanelEl },
    cultistPanelEl && { key: 'you', glyph: '☩', cap: 'You', el: cultistPanelEl },
    liturgyPanelEl && { key: 'cult', glyph: '⚚', cap: 'Cult', el: liturgyPanelEl },
    cultist && tier !== 'witness' && { key: 'rites', glyph: '✶', cap: 'Rites', el: ritePanelEl },
    sanityPanelEl && { key: 'mind', glyph: '☾', cap: 'Mind', el: sanityPanelEl },
    cultist && tier !== 'witness' && { key: 'pact', glyph: '⛧', cap: 'Pact', el: pactPanelEl },
    { key: 'awaken', glyph: '✦', cap: 'Awaken', el: awakeningPanelEl },
    { key: 'ranks', glyph: '♆', cap: 'Ranks', el: leaderboardEl },
  ].filter(Boolean) as { key: string; glyph: string; cap: string; el: React.ReactNode }[]

  const activeSheet = isMobile ? dockTabs.find(t => t.key === activeTab) : null

  return (
    <>
      <div className="fog" aria-hidden><span /><span /><span /></div>

      <ErrorBoundary>
        <Suspense fallback={<div className="globe-loading" aria-hidden />}>
          <Globe
            cells={cells}
            userCellId={cultist?.cellId ?? null}
            onCellClick={handleCellSelect}
            selectedCellId={selectedCell?.id ?? null}
            pulsingCellId={pulsingCellId}
            roilStrike={roilStrike}
            targetStatus={targetStatus}
            paused={!!targetingRite || spreading}
          />
        </Suspense>
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

      {/* The Roil's blow registers as a flash of the indifferent void. */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 6, pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 42%, rgba(168,120,224,0.28), rgba(124,107,176,0.12) 38%, transparent 68%)',
          opacity: roilFlash ? 1 : 0,
          transition: roilFlash ? 'opacity 0.08s ease-out' : 'opacity 0.42s ease-in',
        }}
      />

      {/* The Awakening: a god wakes — a deep gold burst swallows the world before it reseeds. */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 7, pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 45%, rgba(216,169,58,0.5), rgba(207,53,80,0.22) 42%, transparent 72%)',
          opacity: awakeningFlash ? 1 : 0,
          transition: awakeningFlash ? 'opacity 0.12s ease-out' : 'opacity 0.9s ease-in',
        }}
      />

      <div className="logo">FHTAGN</div>

      <WorldPanel stats={worldStats} totalDevotion={totalDevotion} awakening={awakening} />

      <ToastSystem toasts={toasts} />

      <PwaPrompts />

      {/* Desktop: panels float around the edges. Mobile: the rune dock + sheet below. */}
      {!isMobile && (
        <>
          {leaderboardEl}
          {infoPanelEl}
          {cultistPanelEl}
          {liturgyPanelEl}
          {ritePanelEl}
          {pactPanelEl}
          {sanityPanelEl}
          {awakeningPanelEl}
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

      {greatRiteTracing && (
        <SigilCanvas
          rite={GREAT_RITE_SIGIL}
          targetCellName={userCell?.name ?? 'your cell'}
          onMatch={castGreatRite}
          onCancel={() => setGreatRiteTracing(false)}
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

      {spreading && (
        <div className="targeting-overlay" style={{
          position: 'absolute', bottom: 160, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, background: 'rgba(43, 191, 168, 0.18)', border: '1px solid rgba(43, 191, 168, 0.45)',
          borderRadius: 8, padding: '8px 16px', fontSize: 12, color: 'var(--teal)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span>Spreading the Word ({SPREAD_RANGE_KM}km)</span>
          <button
            onClick={() => setSpreading(false)}
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
