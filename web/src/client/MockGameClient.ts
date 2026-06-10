import type {
  Cell, CellDetail, Cultist, Rite, Pact, WorldStats, Contributor,
  LeaderboardKind, PatronId, GameEvent, RiteFamily, Bargain, BargainCatch, BargainOutcome,
  ConvertResult, AwakeningState, GreatRiteResult,
} from '../types'
import { GameClient, EventBus, ConnectionState, InvokeResult } from './GameClient'
import { SEED_CELLS } from '../game/seedCells'
import { PATRONS, RITE_BY_TYPE, RITE_THRESHOLDS, REVELATION_RITE_POOL } from '../game/catalog'
import { rollBargain, perTickSpringChance } from '../game/bargains'
import {
  canConvert, greatWorkBreakdown, greatWorkScore, worldAlignment,
  SPREAD_RANGE_KM, SPREAD_SEED_RETENTION, LORE_PER_CONVERSION,
} from '../game/awakening'
import { haversineKm } from '../game/geo'

const SAVE_KEY = 'fhtagn.save.v1'
const TICK_MS = 1600

// Wards vs the Roil (spec §9: "ritual/wards lower per-cell odds but never to zero").
const WARD_MAX = 80          // a fully-tended ward caps mitigation at 80% — never total
const WARD_STEP = 18         // each rite of warding raises the home ward this much
const WARD_DECAY = 1.2       // wards erode each tick; they must be tended, not set-and-forget
const WARD_ABSORB = 22       // a strike that lands spends part of the ward blunting it

/** Mitigation in [0, WARD_MAX/100] a ward of the given level grants. */
function wardMitigation(wardLevel: number): number {
  return Math.min(WARD_MAX, Math.max(0, wardLevel)) / 100
}

/** A catch accepted and waiting to spring (or pass) over its window. */
interface PendingCatch {
  bargainId: string
  catch: BargainCatch
  window: number      // fixed; drives the per-tick spring probability
  ticksLeft: number
}

interface SaveState {
  cells: Cell[]
  cultist: Cultist | null
  rites: Rite[]
  pact: Pact | null
  bargain?: Bargain | null
  pendingCatches?: PendingCatch[]
  season?: number
}

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function randInt(lower: number, upper: number): number {
  return lower + Math.floor(Math.random() * (upper - lower + 1))
}

// Seed cells with varied starting devotion + a patron, so the world reads as
// alive and the Devotion leaderboard has shape from the first frame.
function seedCells(): Cell[] {
  const patronIds = PATRONS.map(p => p.id)
  return SEED_CELLS.map((s, i) => {
    const h = hashStr(s.id)
    const base = 4_000 + (h % 480_000)            // 4k .. 484k
    const devotion = Math.round(base * (0.5 + ((h >> 3) % 100) / 100))
    return {
      ...s,
      devotion,
      peakDevotion: devotion,
      claimed: h % 5000,
      contributorCount: 1 + (h % 240),
      riteStockpile: (h % 7 === 0) ? 1 + (h % 3) : 0,
      patronId: patronIds[(h + i) % patronIds.length] as PatronId,
      // A scattering of cells start partly warded, so the world shows the practice.
      wardLevel: (h % 5 === 0) ? 20 + (h % 30) : 0,
      // Some spread + lore already, so the Reach/Lore boards have shape from frame 1.
      reach: h % 7,
      lore: h % 11,
    }
  })
}

export class MockGameClient implements GameClient {
  private bus = new EventBus()
  private cells: Cell[]
  private cultist: Cultist | null
  private rites: Rite[]
  private pactRec: Pact | null
  private bargain: Bargain | null
  private pendingCatches: PendingCatch[]
  private offerCooldown = 4          // ticks before the Tempter may call unbidden
  private season: number
  private lastAwakeningProgress = 0  // throttles the awakening_progress telegraph
  private wasAligned = false
  private timer: ReturnType<typeof setInterval> | null = null
  private savePending = false

  constructor() {
    const loaded = this.load()
    this.cells = (loaded?.cells ?? seedCells()).map(c => ({
      ...c, wardLevel: c.wardLevel ?? 0, reach: c.reach ?? 0, lore: c.lore ?? 0,
    }))
    this.cultist = loaded?.cultist ?? null
    this.rites = loaded?.rites ?? []
    this.pactRec = loaded?.pact ?? null
    this.bargain = loaded?.bargain ?? null
    this.pendingCatches = loaded?.pendingCatches ?? []
    this.season = loaded?.season ?? 1
    this.startTicking()
  }

  // ---------- persistence ----------
  private load(): SaveState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      return raw ? (JSON.parse(raw) as SaveState) : null
    } catch { return null }
  }

  private save(): void {
    if (this.savePending) return
    this.savePending = true
    setTimeout(() => {
      this.savePending = false
      try {
        const state: SaveState = {
          cells: this.cells, cultist: this.cultist, rites: this.rites, pact: this.pactRec,
          bargain: this.bargain, pendingCatches: this.pendingCatches, season: this.season,
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(state))
      } catch { /* quota / private mode — best effort */ }
    }, 500)
  }

  private cell(id: string): Cell | undefined {
    return this.cells.find(c => c.id === id)
  }

  private emit(e: GameEvent): void { this.bus.emit(e) }

  // ---------- living world ----------
  private startTicking(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  private tick(): void {
    // Bot cells accrue devotion (patron-flavored), so the planet feels alive.
    const growers = 6 + Math.floor(Math.random() * 6)
    for (let i = 0; i < growers; i++) {
      const c = this.cells[Math.floor(Math.random() * this.cells.length)]
      if (!c || c.id === this.cultist?.cellId) continue
      const patronMul = c.patronId === 'shub-niggurath' ? 1.6 : c.patronId === 'cthulhu' ? 1.2 : 1
      const gain = Math.round((20 + Math.random() * 220) * patronMul)
      c.devotion += gain
      if (c.devotion > c.peakDevotion) c.peakDevotion = c.devotion
      this.emit({ type: 'cell_update', data: cellUpdate(c) })
    }

    // Wards erode every tick — left untended, a cell drifts back to bare (spec §9).
    for (const c of this.cells) {
      if (c.wardLevel > 0) c.wardLevel = Math.max(0, c.wardLevel - WARD_DECAY)
    }

    // The Roil: Azathoth's blind, bubbling churn falls on a cell (spec §9, telegraphed
    // so it reads as fate). Wards lower a cell's odds of being chosen and blunt the
    // blow if it lands — but never to zero. Real strike worker comes later; this is the toy.
    if (Math.random() < 0.18) {
      const c = this.pickRoilTarget()
      if (c) {
        const mitigation = wardMitigation(c.wardLevel)
        const damage = Math.round(randInt(2_000, 18_000) * (1 - mitigation))
        const warded = c.wardLevel > 0
        c.devotion = Math.max(0, c.devotion - damage)
        c.claimed += damage
        if (warded) c.wardLevel = Math.max(0, c.wardLevel - WARD_ABSORB)  // the ward spends itself
        this.emit({ type: 'roil_strike', data: { targetCellId: c.id, damage, toLat: c.lat, toLng: c.lng, warded } })
        this.emit({ type: 'cell_update', data: cellUpdate(c) })
      }
    }

    // Bot-vs-bot rite, so strikes streak across the globe even before the player acts.
    if (Math.random() < 0.22) {
      const from = this.cells[Math.floor(Math.random() * this.cells.length)]
      const to = this.cells[Math.floor(Math.random() * this.cells.length)]
      if (from && to && from.id !== to.id) {
        const damage = randInt(300, 7000)
        to.devotion = Math.max(0, to.devotion - damage)
        to.claimed += damage
        this.emit({
          type: 'rite_strike',
          data: {
            casterName: 'a rival cell', casterCellName: from.name, targetCellId: to.id,
            riteType: damage > 3000 ? 'Manifestation' : 'Whisper', damage,
            fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng,
          },
        })
        this.emit({ type: 'cell_update', data: cellUpdate(to) })
      }
    }

    // Bot spread: a cell carries its faith into a nearby uncommitted or weaker
    // cell (spec §9). Reach and Lore boards evolve, and the world creeps toward
    // the Awakening — so the endgame arrives whether or not the player pushes it.
    if (Math.random() < 0.14) {
      const src = this.cells[Math.floor(Math.random() * this.cells.length)]
      if (src && src.id !== this.cultist?.cellId && src.devotion > 2_000) {
        const target = this.pickSpreadTarget(src)
        if (target) {
          const fromPatron = target.patronId
          target.patronId = src.patronId
          target.devotion += Math.round(src.devotion * 0.03)
          if (target.devotion > target.peakDevotion) target.peakDevotion = target.devotion
          src.reach += 1
          src.lore += 1
          this.emit({ type: 'cell_converted', data: {
            cellId: target.id, cellName: target.name, fromPatronId: fromPatron,
            toPatronId: src.patronId as PatronId, byCellName: src.name,
          } })
          this.emit({ type: 'cell_update', data: cellUpdate(src) })
          this.emit({ type: 'cell_update', data: cellUpdate(target) })
        }
      }
    }

    // Low sanity: phantom incoming the player cannot distinguish from the real
    // thing — pure client-side dread, NO state change (spec §7).
    if (this.cultist && this.cultist.sanity < 30 && Math.random() < 0.3) {
      const me = this.cell(this.cultist.cellId)
      const from = this.cells[Math.floor(Math.random() * this.cells.length)]
      if (me && from) {
        this.emit({
          type: 'rite_incoming',
          data: {
            casterName: 'something that is not there', casterCellName: from.name,
            targetCellId: me.id, riteType: 'Whisper', damage: 0,
            fromLat: from.lat, fromLng: from.lng, toLat: me.lat, toLng: me.lng,
          },
        })
        this.emit({ type: 'sanity_update', data: { sanity: this.cultist.sanity, hallucination: true } })
      }
    }

    this.tempterTick()
    this.awakeningTick()
    this.save()
  }

  // ---------- Nyarlathotep, the Tempter (spec §6, §7) ----------
  // Two halves run every tick: resolve catches already in play (the price of
  // past bargains), then — if no offer stands — decide whether to tempt anew.
  private tempterTick(): void {
    const cu = this.cultist
    if (!cu || cu.tier === 'witness') return

    this.resolveCatches()

    if (this.offerCooldown > 0) this.offerCooldown -= 1
    // The fraying mind is courted far more often than the lucid one (spec §6).
    const t = Math.max(0, Math.min(1, (100 - cu.sanity) / 100))
    const offerChance = 0.03 + t * 0.22
    if (!this.bargain && this.offerCooldown <= 0 && Math.random() < offerChance) {
      this.makeOffer()
    }
  }

  private makeOffer(): void {
    const cu = this.cultist
    if (!cu) return
    const b = rollBargain(cu.sanity, uid())
    if (!b) return
    this.bargain = b
    this.offerCooldown = 6   // a quiet beat before the next unbidden call
    this.emit({ type: 'bargain_offer', data: { bargain: b } })
    this.save()
  }

  // Each accepted catch rolls per tick over its window; it springs once, or the
  // window empties and the gamble passes — getting away clean is real, which is
  // what keeps risky play tempting (spec §7).
  private resolveCatches(): void {
    if (this.pendingCatches.length === 0) return
    const survivors: PendingCatch[] = []
    for (const pc of this.pendingCatches) {
      const perTick = perTickSpringChance(pc.catch.chance, pc.window)
      if (Math.random() < perTick) {
        this.springCatch(pc.catch)
        continue
      }
      pc.ticksLeft -= 1
      if (pc.ticksLeft <= 0) {
        this.emit({ type: 'bargain_sprung', data: {
          kind: 'passed', sprung: false,
          message: 'The pact passes unclaimed. The Crawling Chaos forgets nothing, but tonight it stays its hand.',
        } })
      } else {
        survivors.push(pc)
      }
    }
    this.pendingCatches = survivors
  }

  private springCatch(c: BargainCatch): void {
    const cu = this.cultist
    const home = cu ? this.cell(cu.cellId) : undefined
    if (!cu || !home) return

    if (c.kind === 'attention') {
      const damage = c.devotionLoss ?? 20_000
      home.devotion = Math.max(0, home.devotion - damage)
      home.claimed += damage
      const from = this.cells[Math.floor(Math.random() * this.cells.length)] ?? home
      this.emit({ type: 'rite_strike', data: {
        casterName: 'Nyarlathotep', casterCellName: 'the spaces between', targetCellId: home.id,
        riteType: 'the price named', damage,
        fromLat: from.lat, fromLng: from.lng, toLat: home.lat, toLng: home.lng,
      } })
      this.emit({ type: 'cell_update', data: cellUpdate(home) })
      this.emit({ type: 'bargain_sprung', data: {
        kind: 'attention', sprung: true,
        message: `The gift is called in: ${damage.toLocaleString()} devotion torn from your cell as something vast turns its eye upon you.`,
      } })
    } else if (c.kind === 'defection') {
      const damage = c.devotionLoss ?? 12_000
      home.devotion = Math.max(0, home.devotion - damage)
      home.claimed += damage
      home.contributorCount = Math.max(1, home.contributorCount - (c.contributorLoss ?? 4))
      this.emit({ type: 'cell_update', data: cellUpdate(home) })
      this.emit({ type: 'bargain_sprung', data: {
        kind: 'defection', sprung: true,
        message: `The swarm turns. ${damage.toLocaleString()} devotion walks out into the dark, singing for another.`,
      } })
    } else if (c.kind === 'false-clarity') {
      const crash = c.sanityCrash ?? 30
      cu.sanity = Math.max(0, cu.sanity - crash)
      this.emit({ type: 'sanity_update', data: { sanity: cu.sanity } })
      this.emit({ type: 'bargain_sprung', data: {
        kind: 'false-clarity', sprung: true,
        message: 'The quiet was a held breath. It breaks — and you fall further than the calm ever lifted you.',
      } })
    }
    this.save()
  }

  // ---------- GameClient: reads ----------
  async listCells(): Promise<Cell[]> { return this.cells.map(c => ({ ...c })) }

  async getCellDetail(id: string): Promise<CellDetail> {
    const c = this.cell(id)
    if (!c) throw new Error('unknown cell')
    return { ...c, topContributors: mockContributors(c), dailyChangePercent: mockDaily(c) }
  }

  async leaderboard(kind: LeaderboardKind, limit = 10): Promise<Cell[]> {
    // Three distinct boards (spec §9): Devotion ranks raw faith; Reach ranks the
    // spread of a cult; Lore ranks the forbidden knowledge it has uncovered. Ties
    // fall back to devotion so the order is always stable.
    const key = kind === 'reach' ? (c: Cell) => c.reach
      : kind === 'lore' ? (c: Cell) => c.lore
      : (c: Cell) => c.devotion
    return [...this.cells]
      .sort((a, b) => (key(b) - key(a)) || (b.devotion - a.devotion))
      .slice(0, limit)
      .map(c => ({ ...c }))
  }

  async stats(): Promise<WorldStats> {
    const total = this.cells.reduce((s, c) => s + c.devotion, 0)
    const peak = this.cells.reduce((m, c) => (c.peakDevotion > m.peakDevotion ? c : m), this.cells[0])
    return {
      totalDevotion: total,
      cellCount: this.cells.length,
      peakCellName: peak?.name ?? '',
      peakDevotion: peak?.peakDevotion ?? 0,
      avgDevotion: total / Math.max(1, this.cells.length),
      dailyChangePercent: 0,
      worldRiteStockpile: this.cells.reduce((s, c) => s + c.riteStockpile, 0),
    }
  }

  // ---------- GameClient: identity ----------
  async me(): Promise<Cultist | null> { return this.cultist ? { ...this.cultist } : null }

  async register(name: string, cellId: string, patronId: PatronId): Promise<Cultist> {
    this.cultist = {
      id: uid(), name, cellId, patronId, sanity: 100,
      totalChants: 0, tier: 'initiate', souls: 0,
      best10s: 0, best1day: 0, riteProgress: 0, lastRevelationThreshold: 0,
    }
    const home = this.cell(cellId)
    if (home && !home.patronId) home.patronId = patronId
    if (home) home.contributorCount += 1
    this.save()
    return { ...this.cultist }
  }

  async myRites(): Promise<Rite[]> { return this.rites.filter(r => !r.invoked).map(r => ({ ...r })) }

  // ---------- GameClient: actions ----------
  chant(): void {
    const cu = this.cultist
    if (!cu || cu.tier === 'witness') return
    const home = this.cell(cu.cellId)
    if (!home) return
    const mult = cu.tier === 'highPriest' ? 2 : 1

    home.devotion += mult
    if (home.devotion > home.peakDevotion) home.peakDevotion = home.devotion
    cu.totalChants += mult
    cu.riteProgress += mult

    // Chanting claws sanity back toward lucidity (spec §7).
    cu.sanity = Math.min(100, cu.sanity + 0.06 * mult)

    this.checkRevelations(cu)
    this.checkRiteProgression(cu)
    this.emit({ type: 'cell_update', data: cellUpdate(home) })
    this.emit({ type: 'sanity_update', data: { sanity: cu.sanity } })
    this.save()
  }

  async invokeRite(riteId: string, targetCellId: string): Promise<InvokeResult> {
    const cu = this.cultist
    if (!cu) throw new Error('not a cultist')
    const rite = this.rites.find(r => r.id === riteId && !r.invoked)
    if (!rite) throw new Error('no such rite')
    const from = this.cell(cu.cellId)
    const to = this.cell(targetCellId)
    if (!from || !to) throw new Error('unknown cell')

    const dist = haversineKm(from.lat, from.lng, to.lat, to.lng)
    if (dist > rite.rangeKm) throw new Error(`target beyond the rite’s reach (${Math.round(dist)}km > ${rite.rangeKm}km)`)

    const damage = randInt(rite.damageLower, rite.damageUpper)
    to.devotion = Math.max(0, to.devotion - damage)
    to.claimed += damage
    cu.souls += damage
    rite.invoked = true
    rite.invokedAt = new Date().toISOString()
    rite.targetCellId = targetCellId
    rite.devotionClaimed = damage
    if (from.riteStockpile > 0) from.riteStockpile -= 1
    // Wielding eldritch power uncovers lore — the home cell's Great Work deepens.
    from.lore += rite.tier

    // Power has a price: invoking eldritch rites costs sanity, scaled by tier.
    const sanityCost = rite.tier === 3 ? 12 : rite.tier === 2 ? 7 : 3
    cu.sanity = Math.max(0, cu.sanity - sanityCost)

    this.emit({
      type: 'rite_strike',
      data: {
        casterName: cu.name, casterCellName: from.name, targetCellId,
        riteType: rite.riteType, damage,
        fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng,
      },
    })
    this.emit({ type: 'cell_update', data: cellUpdate(from) })
    this.emit({ type: 'cell_update', data: cellUpdate(to) })
    this.emit({ type: 'sanity_update', data: { sanity: cu.sanity } })
    this.save()
    return { damage, riteType: rite.riteType, targetCellName: to.name }
  }

  // ---------- GameClient: ascension (mock-billed) ----------
  async pact(): Promise<Pact | null> { return this.pactRec ? { ...this.pactRec } : null }

  async ascend(plan: string): Promise<Pact> {
    if (!this.cultist) throw new Error('not a cultist')
    const now = Date.now()
    const days = plan === 'monthly' ? 30 : 7
    this.pactRec = {
      id: uid(), cultistId: this.cultist.id, plan,
      startedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + days * 86400_000).toISOString(),
    }
    this.cultist.tier = 'highPriest'
    this.save()
    return { ...this.pactRec }
  }

  async renew(): Promise<Pact> {
    if (!this.pactRec || !this.cultist) throw new Error('no pact')
    const cur = new Date(this.pactRec.expiresAt).getTime()
    const now = Date.now()
    const base = Math.max(cur, now)
    const days = this.pactRec.plan === 'monthly' ? 30 : 7
    // Early renewal (within 48h) grants +20% duration (spec §5).
    const bonus = cur - now > 0 && cur - now <= 48 * 3600_000 ? 1.2 : 1
    this.pactRec.expiresAt = new Date(base + days * 86400_000 * bonus).toISOString()
    this.cultist.tier = 'highPriest'
    this.save()
    return { ...this.pactRec }
  }

  // ---------- GameClient: sanity ----------
  adjustSanity(delta: number, hallucination?: boolean): void {
    if (!this.cultist) return
    this.cultist.sanity = Math.max(0, Math.min(100, this.cultist.sanity + delta))
    this.emit({ type: 'sanity_update', data: { sanity: this.cultist.sanity, hallucination } })
    this.save()
  }

  riteOfLucidity(): void {
    this.adjustSanity(12)
  }

  // ---------- the Roil & wards (spec §9) ----------
  // Weighted pick: a well-warded cell is far less likely to be chosen, but its
  // weight is floored above zero — the Roil never spares anyone entirely.
  private pickRoilTarget(): Cell | undefined {
    let total = 0
    const weights = this.cells.map(c => {
      const w = Math.max(0.2, 1 - wardMitigation(c.wardLevel))
      total += w
      return w
    })
    let r = Math.random() * total
    for (let i = 0; i < this.cells.length; i++) {
      r -= weights[i]
      if (r <= 0) return this.cells[i]
    }
    return this.cells[this.cells.length - 1]
  }

  ward(): void {
    const cu = this.cultist
    if (!cu || cu.tier === 'witness') return
    const home = this.cell(cu.cellId)
    if (!home) return
    home.wardLevel = Math.min(WARD_MAX, home.wardLevel + WARD_STEP)
    // Tending the wards is lucid, deliberate work — a small balm to the mind.
    cu.sanity = Math.min(100, cu.sanity + 1.5)
    this.emit({ type: 'cell_update', data: cellUpdate(home) })
    this.emit({ type: 'sanity_update', data: { sanity: cu.sanity } })
    this.save()
  }

  // ---------- spread, conversion & the Awakening (spec §9) ----------
  // A weaker, uncommitted, or rival-but-overpowered cell within range — the
  // natural prey for a bot cell's spread. Samples a handful to stay cheap.
  private pickSpreadTarget(src: Cell): Cell | undefined {
    for (let tries = 0; tries < 6; tries++) {
      const c = this.cells[Math.floor(Math.random() * this.cells.length)]
      if (!c || c.id === src.id || c.id === this.cultist?.cellId) continue
      if (c.patronId === src.patronId) continue
      if (c.patronId !== null && c.devotion >= src.devotion) continue
      if (haversineKm(src.lat, src.lng, c.lat, c.lng) > SPREAD_RANGE_KM) continue
      return c
    }
    return undefined
  }

  async convert(targetCellId: string): Promise<ConvertResult> {
    const cu = this.cultist
    if (!cu || cu.tier === 'witness' || !cu.patronId) throw new Error('only the sworn may spread')
    const home = this.cell(cu.cellId)
    const target = this.cell(targetCellId)
    if (!home || !target) throw new Error('unknown cell')

    const check = canConvert(home, target, cu.patronId)
    if (!check.ok) throw new Error(check.reason ?? 'the word will not carry there')
    const cost = check.cost ?? 0

    const fromPatron = target.patronId
    home.devotion = Math.max(0, home.devotion - cost)
    target.patronId = cu.patronId
    target.devotion += Math.round(cost * SPREAD_SEED_RETENTION)
    if (target.devotion > target.peakDevotion) target.peakDevotion = target.devotion
    target.contributorCount += 1
    home.reach += 1
    home.lore += LORE_PER_CONVERSION
    // Spreading the word is fervent, lucid work — a small balm to the mind.
    cu.sanity = Math.min(100, cu.sanity + 1)

    this.emit({ type: 'cell_converted', data: {
      cellId: target.id, cellName: target.name, fromPatronId: fromPatron,
      toPatronId: cu.patronId, byCellName: home.name,
    } })
    this.emit({ type: 'cell_update', data: cellUpdate(home) })
    this.emit({ type: 'cell_update', data: cellUpdate(target) })
    this.emit({ type: 'sanity_update', data: { sanity: cu.sanity } })
    this.save()
    return { cellName: target.name, toPatronId: cu.patronId, reach: home.reach }
  }

  async awakeningState(): Promise<AwakeningState> {
    const view = worldAlignment(this.cells)
    const home = this.cultist ? this.cell(this.cultist.cellId) : null
    const homeBreakdown = home
      ? greatWorkBreakdown(home)
      : { devotion: 0, lore: 0, reach: 0, total: 0 }
    const homeScore = homeBreakdown.total
    return {
      progress: view.progress, aligned: view.aligned, goal: view.goal, season: this.season,
      leaderCellName: view.leader?.name ?? '', leaderPatronId: view.leader?.patronId ?? null,
      homeScore, homeBreakdown, homeQualifies: homeScore >= view.goal,
    }
  }

  async greatRite(): Promise<GreatRiteResult> {
    const cu = this.cultist
    if (!cu) throw new Error('not a cultist')
    const home = this.cell(cu.cellId)
    if (!home) throw new Error('no home cell')
    const view = worldAlignment(this.cells)
    if (!view.aligned) throw new Error('the stars are not yet right')
    if (greatWorkScore(home) < view.goal) throw new Error('your cell is not ready for the Great Rite')
    const patronId = (home.patronId ?? cu.patronId) as PatronId
    const cellName = home.name
    this.triggerAwakening(home, true)
    return { patronId, cellName, season: this.season }
  }

  // Telegraph the approach of the Awakening (throttled), then — once the stars
  // are right — let the foremost RIVAL cell race to the Great Rite. The player
  // must beat them to it via greatRite(); dawdling lets a rival wake their god
  // and reseed the world (spec §9: the reason to push past safe play).
  private awakeningTick(): void {
    const view = worldAlignment(this.cells)
    if (Math.abs(view.progress - this.lastAwakeningProgress) >= 0.02 || view.aligned !== this.wasAligned) {
      this.lastAwakeningProgress = view.progress
      this.wasAligned = view.aligned
      this.emit({ type: 'awakening_progress', data: {
        progress: view.progress, aligned: view.aligned,
        leaderCellName: view.leader?.name ?? '', leaderPatronId: view.leader?.patronId ?? null,
      } })
    }
    if (view.aligned && view.leader && view.leader.id !== this.cultist?.cellId && Math.random() < 0.06) {
      this.triggerAwakening(view.leader, false)
    }
  }

  private triggerAwakening(cell: Cell, byYou: boolean): void {
    const patronId = (cell.patronId ?? 'cthulhu') as PatronId
    this.season += 1
    this.emit({ type: 'awakening_triggered', data: {
      patronId, cellName: cell.name, cellId: cell.id, season: this.season, byYou,
    } })
    this.reseed()
  }

  // The world unmakes and begins anew. The cultist endures — patron, sanity,
  // lifetime devotion and known rites persist — but the map resets to seed and a
  // new cycle begins (spec §9: season loop).
  private reseed(): void {
    const cu = this.cultist
    this.cells = seedCells()
    if (cu) {
      const home = this.cell(cu.cellId)
      if (home) {
        if (!home.patronId) home.patronId = cu.patronId
        home.contributorCount += 1
      }
    }
    this.bargain = null
    this.pendingCatches = []
    this.lastAwakeningProgress = 0
    this.wasAligned = false
    this.offerCooldown = 6
    this.save()
  }

  // ---------- GameClient: bargains ----------
  async currentBargain(): Promise<Bargain | null> {
    return this.bargain ? { ...this.bargain } : null
  }

  courtTempter(): void {
    // He always answers a call — a fresh offer replaces any standing one.
    if (!this.cultist || this.cultist.tier === 'witness') return
    this.makeOffer()
  }

  async acceptBargain(id: string): Promise<BargainOutcome> {
    const cu = this.cultist
    if (!cu) throw new Error('not a cultist')
    const b = this.bargain
    if (!b || b.id !== id) throw new Error('that offer has passed')
    this.bargain = null
    const home = this.cell(cu.cellId)

    // The visible half of the trade: take the grant, pay the named sanity cost.
    if (b.grantRiteType) this.grantRite(cu, b.grantRiteType, 'bargain')
    if (b.grantDevotion && home) {
      home.devotion += b.grantDevotion
      if (home.devotion > home.peakDevotion) home.peakDevotion = home.devotion
    }
    // Forbidden knowledge passes with every pact — a tome deepens it most.
    if (home) {
      home.lore += b.kind === 'tome' ? 6 : 3
      this.emit({ type: 'cell_update', data: cellUpdate(home) })
    }
    if (b.grantSanity) cu.sanity = Math.min(100, cu.sanity + b.grantSanity)
    if (b.sanityCost) cu.sanity = Math.max(0, cu.sanity - b.sanityCost)
    this.emit({ type: 'sanity_update', data: { sanity: cu.sanity } })

    // The hidden half: the catch is now in play, to spring or pass over its window.
    this.pendingCatches.push({ bargainId: b.id, catch: b.catch, window: b.window, ticksLeft: b.window })

    this.emit({ type: 'revelation_earned', data: {
      revelationName: 'A pact is sealed', riteType: b.grantRiteType,
    } })
    this.save()
    return { granted: b.grantLabel, sanityCost: b.sanityCost }
  }

  declineBargain(id: string): void {
    if (this.bargain && this.bargain.id === id) {
      this.bargain = null
      this.save()
    }
  }

  // ---------- realtime ----------
  on(handler: (e: GameEvent) => void): () => void { return this.bus.on(handler) }
  connectionState(): ConnectionState { return 'connected' }

  // ---------- revelations & rite progression (computed, spec §11) ----------
  private grantRite(cu: Cultist, riteType: string, source: string): void {
    const def = RITE_BY_TYPE[riteType]
    if (!def) return
    // One standing rite per source; a new grant replaces the unfired previous.
    this.rites = this.rites.filter(r => !(r.source === source && !r.invoked))
    const home = this.cell(cu.cellId)
    if (home) home.riteStockpile += 1
    this.rites.push({
      id: uid(), cultistId: cu.id, riteType: def.riteType, family: def.family as RiteFamily,
      tier: def.tier, source, rangeKm: def.rangeKm,
      damageLower: def.damageLower, damageUpper: def.damageUpper,
      invoked: false, devotionClaimed: 0,
    })
  }

  private checkRevelations(cu: Cultist): void {
    const milestones: { at: number; name: string }[] = [
      { at: 200, name: 'A Good Start' },
      { at: 1000, name: 'New Voice in the Choir' },
    ]
    for (const m of milestones) {
      if (cu.totalChants >= m.at && cu.lastRevelationThreshold < m.at) {
        cu.lastRevelationThreshold = m.at
        const riteType = REVELATION_RITE_POOL[hashStr(m.name) % REVELATION_RITE_POOL.length]
        this.grantRite(cu, riteType, 'revelation')
        this.emit({ type: 'revelation_earned', data: { revelationName: m.name, riteType } })
      }
    }
    // "Local Prophet" every 5,000 chants beyond the fixed milestones.
    if (cu.totalChants >= 5000) {
      const step = Math.floor(cu.totalChants / 5000) * 5000
      if (cu.lastRevelationThreshold < step) {
        cu.lastRevelationThreshold = step
        const riteType = REVELATION_RITE_POOL[(step / 5000) % REVELATION_RITE_POOL.length]
        this.grantRite(cu, riteType, 'revelation')
        this.emit({ type: 'revelation_earned', data: { revelationName: 'Local Prophet', riteType } })
      }
    }
  }

  private checkRiteProgression(cu: Cultist): void {
    // High Priests upgrade a single standing rite as devotion crosses thresholds.
    if (cu.tier !== 'highPriest') return
    let unlocked: string | null = null
    for (const t of RITE_THRESHOLDS) {
      if (cu.riteProgress >= t.threshold) unlocked = t.riteType
    }
    if (!unlocked) return
    const current = this.rites.find(r => r.source === 'chant' && !r.invoked)
    if (current?.riteType === unlocked) return
    this.grantRite(cu, unlocked, 'chant')
    this.emit({ type: 'revelation_earned', data: { revelationName: 'The rite deepens', riteType: unlocked } })
  }
}

// ---- helpers ----
function cellUpdate(c: Cell) {
  return {
    cellId: c.id, devotion: c.devotion, contributorCount: c.contributorCount,
    peakDevotion: c.peakDevotion, wardLevel: c.wardLevel, reach: c.reach, lore: c.lore,
  }
}

function mockContributors(c: Cell): Contributor[] {
  const names = ['The Hollow Choir', 'Keeper of the Sign', 'One Who Waits', 'The Pale Acolyte', 'Voice Beneath']
  const n = Math.min(5, Math.max(1, c.contributorCount))
  let remaining = c.devotion
  return names.slice(0, n).map((name, i) => {
    const share = i === n - 1 ? remaining : Math.round(c.devotion * (0.4 / (i + 1)))
    remaining -= share
    return { name, devotion: Math.max(0, share) }
  })
}

function mockDaily(c: Cell): number {
  return ((hashStr(c.id) % 400) - 150) / 10   // -15.0% .. +24.9%
}
