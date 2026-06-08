import type { Bargain, BargainKind, BargainCatchKind } from '../types'

// Nyarlathotep's bargains — the Tempter loop (spec §6, §7).
//
// This module is the *gamble*, kept pure so it can be reasoned about and tested
// in isolation. `rollBargain` turns the player's current sanity into a concrete
// offer; the client applies it and later resolves the hidden catch. Two
// invariants make accepting a genuine gamble rather than a solved trade:
//
//   1. As sanity falls, offers get STRONGER (better grants) and catches get
//      WORSE (higher chance, bigger loss). Power and danger rise together.
//   2. The catch's chance and magnitude are never surfaced to the UI. The player
//      gambles on the flavour's hint, not on numbers.

type Rng = () => number

/** 0 at full lucidity, 1 at the brink — how deep the player has delved. */
function delveT(sanity: number): number {
  return Math.max(0, Math.min(1, (100 - sanity) / 100))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]
}

function range(lower: number, upper: number, rng: Rng): number {
  return Math.round(lower + rng() * (upper - lower))
}

interface Template {
  kind: BargainKind
  title: string
  flavor: string
  catchKind: BargainCatchKind
  /** Eligible only when sanity is within [min, max]; drives sanity-gating. */
  band: [number, number]
  window: number
  build: (sanity: number, rng: Rng) => Pick<
    Bargain,
    'grantLabel' | 'grantRiteType' | 'grantDevotion' | 'grantSanity' | 'sanityCost' | 'catch'
  >
}

// Rite pools deepen with the delve — forbidden Cataclysm only at the bottom.
const GIFT_POOL_SHALLOW = ['Whisper II', 'Whisper III', 'Manifestation I']
const GIFT_POOL_DEEP = ['Manifestation I', 'Manifestation II', 'Manifestation III']
const TOME_POOL = ['Manifestation III', 'Cataclysm I', 'Cataclysm II']

const TEMPLATES: Template[] = [
  {
    kind: 'gift',
    title: 'A Gift of Sight',
    flavor: 'A figure of a thousand masks offers a sign, freely. “Take it. I ask nothing now — only later, and only once.”',
    catchKind: 'attention',
    band: [0, 100],
    window: 8,
    build: (sanity, rng) => {
      const t = delveT(sanity)
      const riteType = pick(sanity < 45 ? GIFT_POOL_DEEP : GIFT_POOL_SHALLOW, rng)
      return {
        grantLabel: `the ${riteType}, to trace at will`,
        grantRiteType: riteType,
        sanityCost: range(8, 14, rng),
        catch: {
          kind: 'attention',
          chance: lerp(0.18, 0.42, t),
          devotionLoss: range(8_000, 22_000, rng) + Math.round(t * 30_000),
        },
      }
    },
  },
  {
    kind: 'clarity',
    title: 'The Quiet Mind',
    flavor: '“The noise can stop, if you let it.” The offered calm is sweet, and certain, and the cruellest mask it wears.',
    catchKind: 'false-clarity',
    band: [0, 58],   // preys only on the fraying
    window: 6,
    build: (sanity, rng) => {
      const t = delveT(sanity)
      const grantSanity = range(18, 30, rng)
      return {
        grantLabel: `clarity — ${grantSanity} sanity restored`,
        grantSanity,
        sanityCost: 0,
        catch: {
          kind: 'false-clarity',
          chance: lerp(0.45, 0.7, t),
          // The mask slips: you fall further than the calm ever lifted you.
          sanityCrash: grantSanity + range(10, 24, rng),
        },
      }
    },
  },
  {
    kind: 'swarm',
    title: 'The Swarming Boon',
    flavor: 'Your cell will swell before dawn. Whether the new mouths sing for you, or for something behind you, is not promised.',
    catchKind: 'defection',
    band: [0, 100],
    window: 10,
    build: (sanity, rng) => {
      const t = delveT(sanity)
      const grantDevotion = range(6_000, 14_000, rng) + Math.round(t * 12_000)
      return {
        grantLabel: `a surge of ${grantDevotion.toLocaleString()} devotion`,
        grantDevotion,
        sanityCost: range(9, 15, rng),
        catch: {
          kind: 'defection',
          chance: lerp(0.28, 0.5, t),
          // If they turn, more leaves than the swarm ever brought.
          devotionLoss: Math.round(grantDevotion * lerp(1.3, 2.2, t)),
          contributorLoss: range(3, 12, rng),
        },
      }
    },
  },
  {
    kind: 'tome',
    title: 'The Forbidden Tome',
    flavor: 'Words that should not be read; power that should not be held. It will be held. It will be noticed.',
    catchKind: 'attention',
    band: [0, 48],   // the deep gamble — strongest grant, heaviest price
    window: 7,
    build: (sanity, rng) => {
      const t = delveT(sanity)
      const riteType = pick(TOME_POOL, rng)
      return {
        grantLabel: `the ${riteType} — forbidden lore, yours to wield`,
        grantRiteType: riteType,
        sanityCost: range(16, 24, rng),
        catch: {
          kind: 'attention',
          chance: lerp(0.4, 0.62, t),
          devotionLoss: range(30_000, 60_000, rng) + Math.round(t * 40_000),
        },
      }
    },
  },
]

/** Templates the player's current mind can be tempted with. */
function eligible(sanity: number): Template[] {
  return TEMPLATES.filter(t => sanity >= t.band[0] && sanity <= t.band[1])
}

/**
 * Roll a concrete offer for a given sanity. Lower sanity is tempted more often
 * by the deeper templates (clarity/tome), reflecting Nyarlathotep preying on the
 * fraying mind. Returns null only if nothing is eligible (it never is — `gift`
 * and `swarm` span the whole range — but the caller stays defensive).
 */
export function rollBargain(sanity: number, id: string, rng: Rng = Math.random): Bargain | null {
  const pool = eligible(sanity)
  if (pool.length === 0) return null
  const tpl = pick(pool, rng)
  const built = tpl.build(sanity, rng)
  return {
    id,
    kind: tpl.kind,
    title: tpl.title,
    flavor: tpl.flavor,
    window: tpl.window,
    expiresInTicks: 12,
    ...built,
  }
}

/**
 * Per-tick spring probability such that, summed over the window, the catch
 * springs with its overall `chance`. Keeps the gamble spread across time rather
 * than a single coin-flip the player could brace for.
 */
export function perTickSpringChance(chance: number, window: number): number {
  if (window <= 0) return chance
  return 1 - Math.pow(1 - chance, 1 / window)
}
