import { describe, it, expect } from 'vitest'
import {
  FOLLOWERS, LITANIES, followerCost, baseFollowerRate,
  veilMultiplier, chantPower, devotionPerSec, lucidityTithe,
  BASE_COST_GROWTH, LUCIDITY_TITHE_MIN,
} from './liturgy'
import { DEFAULT_MODS, PATRON_BY_ID } from './catalog'

describe('followerCost', () => {
  it('climbs exponentially with copies owned', () => {
    const f = FOLLOWERS[0]
    expect(followerCost(f, 0)).toBe(f.baseCost)
    expect(followerCost(f, 1)).toBe(Math.round(f.baseCost * BASE_COST_GROWTH))
    expect(followerCost(f, 10)).toBeGreaterThan(followerCost(f, 9))
  })

  it('charges Shub-Niggurath the hungrier growth rate', () => {
    const f = FOLLOWERS[2]
    const shub = PATRON_BY_ID['shub-niggurath'].mods.followerCostGrowth
    expect(shub).toBeGreaterThan(BASE_COST_GROWTH)
    expect(followerCost(f, 8, shub)).toBeGreaterThan(followerCost(f, 8))
  })
})

describe('baseFollowerRate', () => {
  it('sums rate × count across ranks and ignores unknown ids', () => {
    const counts = { [FOLLOWERS[0].id]: 3, [FOLLOWERS[1].id]: 2, ghost: 9 }
    expect(baseFollowerRate(counts)).toBe(3 * FOLLOWERS[0].rate + 2 * FOLLOWERS[1].rate)
  })

  it('is zero with no followers', () => {
    expect(baseFollowerRate({})).toBe(0)
  })
})

describe('veilMultiplier', () => {
  it('pays nothing while lucid and the full slope at the brink', () => {
    expect(veilMultiplier(100, 1.5)).toBe(1)
    expect(veilMultiplier(0, 1.5)).toBe(2.5)
    expect(veilMultiplier(50, 1.5)).toBeCloseTo(1.75)
  })

  it('pays Hastur double for the same madness', () => {
    const base = veilMultiplier(40, DEFAULT_MODS.madnessSlope)
    const hastur = veilMultiplier(40, PATRON_BY_ID.hastur.mods.madnessSlope)
    expect(hastur - 1).toBeCloseTo((base - 1) * 2)
  })

  it('clamps sanity outside [0,100]', () => {
    expect(veilMultiplier(140, 1.5)).toBe(1)
    expect(veilMultiplier(-20, 1.5)).toBe(2.5)
  })
})

describe('chantPower', () => {
  it('doubles per litany learned', () => {
    expect(chantPower(0, DEFAULT_MODS, 1, 1)).toBe(1)
    expect(chantPower(3, DEFAULT_MODS, 1, 1)).toBe(8)
    expect(chantPower(LITANIES.length, DEFAULT_MODS, 1, 1)).toBe(64)
  })

  it('applies patron, Veil, and tier multipliers but never falls below 1', () => {
    const cthulhu = PATRON_BY_ID.cthulhu.mods
    expect(chantPower(0, cthulhu, 1, 1)).toBe(1)                 // 0.75 floors to 1
    expect(chantPower(4, cthulhu, 1, 1)).toBe(12)                // 16 × 0.75
    expect(chantPower(2, DEFAULT_MODS, 1.5, 2)).toBe(12)         // 4 × 1.5 × 2
  })
})

describe('devotionPerSec', () => {
  it('multiplies the raw rate by patron, Veil, and tier', () => {
    const counts = { [FOLLOWERS[0].id]: 10 }                     // 10/s raw
    expect(devotionPerSec(counts, DEFAULT_MODS, 1, 1)).toBe(10)
    expect(devotionPerSec(counts, PATRON_BY_ID.cthulhu.mods, 1, 1)).toBe(15)
    expect(devotionPerSec(counts, DEFAULT_MODS, 2, 1.5)).toBe(30)
  })
})

describe('lucidityTithe', () => {
  it('scales with the cell but never below the floor', () => {
    expect(lucidityTithe(0)).toBe(LUCIDITY_TITHE_MIN)
    expect(lucidityTithe(100_000)).toBe(8_000)
    expect(lucidityTithe(1_000_000)).toBeGreaterThan(lucidityTithe(100_000))
  })
})
