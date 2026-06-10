import { describe, it, expect } from 'vitest'
import {
  canConvert, greatWorkBreakdown, greatWorkScore, worldAlignment, spreadCost,
  SPREAD_RANGE_KM, GREAT_WORK_GOAL, LORE_WEIGHT, REACH_WEIGHT,
} from './awakening'
import type { Cell, PatronId } from '../types'

function cell(over: Partial<Cell> = {}): Cell {
  return {
    id: 'c', name: 'C', country: 'X', countryCode: 'X', lat: 0, lng: 0,
    devotion: 100_000, peakDevotion: 100_000, claimed: 0, contributorCount: 1,
    riteStockpile: 0, patronId: null, wardLevel: 0, reach: 0, lore: 0, ...over,
  }
}

describe('canConvert', () => {
  it('takes the uncommitted within range', () => {
    const home = cell({ id: 'h', lat: 0, lng: 0, devotion: 100_000 })
    const target = cell({ id: 't', lat: 0, lng: 1, patronId: null })
    expect(canConvert(home, target, 'cthulhu').ok).toBe(true)
  })

  it('refuses a target out of range', () => {
    const home = cell({ id: 'h', lat: 0, lng: 0 })
    const target = cell({ id: 't', lat: 0, lng: 90, patronId: null })   // ~10,000km away
    const r = canConvert(home, target, 'cthulhu')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/reach/i)
  })

  it('refuses a cell already sworn to your patron', () => {
    const home = cell({ id: 'h', patronId: 'dagon' })
    const target = cell({ id: 't', lat: 0, lng: 1, patronId: 'dagon' })
    expect(canConvert(home, target, 'dagon').ok).toBe(false)
  })

  it('only flips a strong rival when you overpower it', () => {
    const home = cell({ id: 'h', devotion: 100_000 })
    const strong = cell({ id: 't', lat: 0, lng: 1, devotion: 90_000, patronId: 'dagon' })
    const weak = cell({ id: 't', lat: 0, lng: 1, devotion: 40_000, patronId: 'dagon' })
    expect(canConvert(home, strong, 'cthulhu').ok).toBe(false)   // 100k < 90k * 1.5
    expect(canConvert(home, weak, 'cthulhu').ok).toBe(true)      // 100k > 40k * 1.5
  })

  it('lets Hastur turn even a strong rival (the King in Yellow boon)', () => {
    const home = cell({ id: 'h', devotion: 100_000 })
    const strong = cell({ id: 't', lat: 0, lng: 1, devotion: 90_000, patronId: 'dagon' })
    expect(canConvert(home, strong, 'cthulhu').ok).toBe(false)
    expect(canConvert(home, strong, 'hastur').ok).toBe(true)
  })

  it('refuses when devotion is too thin to seed a cell', () => {
    const home = cell({ id: 'h', devotion: 200 })   // below the minimum spread cost + buffer
    const target = cell({ id: 't', lat: 0, lng: 1, patronId: null })
    expect(canConvert(home, target, 'cthulhu').ok).toBe(false)
  })

  it('reports a cost that scales with the home cell', () => {
    expect(spreadCost(cell({ devotion: 1_000_000 }))).toBeGreaterThan(spreadCost(cell({ devotion: 10_000 })))
  })
})

describe('greatWorkScore', () => {
  it('weights reach and lore above raw devotion', () => {
    const base = cell({ devotion: 100_000, reach: 0, lore: 0 })
    expect(greatWorkScore(base)).toBe(100_000)
    expect(greatWorkScore(cell({ devotion: 100_000, reach: 1 }))).toBe(100_000 + REACH_WEIGHT)
    expect(greatWorkScore(cell({ devotion: 100_000, lore: 1 }))).toBe(100_000 + LORE_WEIGHT)
  })

  it('reports the visible contribution breakdown', () => {
    expect(greatWorkBreakdown(cell({ devotion: 100_000, reach: 2, lore: 3 }))).toEqual({
      devotion: 100_000,
      reach: 2 * REACH_WEIGHT,
      lore: 3 * LORE_WEIGHT,
      total: 100_000 + 2 * REACH_WEIGHT + 3 * LORE_WEIGHT,
    })
  })
})

describe('worldAlignment', () => {
  it('reports the foremost cell and clamps progress to 1', () => {
    const cells = [
      cell({ id: 'a', devotion: 200_000, patronId: 'cthulhu' as PatronId }),
      cell({ id: 'b', devotion: 2 * GREAT_WORK_GOAL, patronId: 'dagon' as PatronId }),
    ]
    const v = worldAlignment(cells)
    expect(v.leader?.id).toBe('b')
    expect(v.progress).toBe(1)
    expect(v.aligned).toBe(true)
  })

  it('is not aligned while every cell sits below the goal', () => {
    const v = worldAlignment([cell({ devotion: GREAT_WORK_GOAL - 1 })])
    expect(v.aligned).toBe(false)
    expect(v.progress).toBeLessThan(1)
  })

  it('handles an empty world', () => {
    const v = worldAlignment([])
    expect(v.leader).toBeNull()
    expect(v.progress).toBe(0)
    expect(v.aligned).toBe(false)
  })
})
