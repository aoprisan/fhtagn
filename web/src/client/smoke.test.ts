import { describe, it, expect, vi } from 'vitest'
import { MockGameClient } from './MockGameClient'

describe('MockGameClient v2 economy smoke', () => {
  it('runs the core loop: register → chant → buy → income → lucidity', async () => {
    vi.useFakeTimers()
    localStorage.clear()
    const game = new MockGameClient()
    const cells = await game.listCells()
    const cu = await game.register('Smoke', cells[0].id, 'shub-niggurath')
    expect(cu.followers).toEqual({})

    // Chant power: base 1 × shub 1.5 → rounds to 2.
    expect(game.chantPower()).toBe(2)
    const before = (await game.listCells()).find(c => c.id === cu.cellId)!.devotion
    game.chant()
    const after = (await game.listCells()).find(c => c.id === cu.cellId)!.devotion
    expect(after - before).toBe(game.chantPower())

    // Buy a follower; income should flow on the next tick.
    const buy = await game.buyFollower('whisperer')
    expect(buy.ok).toBe(true)
    const lit = await game.liturgy()
    expect(lit.followers.whisperer).toBe(1)
    expect(lit.devotionPerSec).toBeGreaterThan(0)

    // Litany doubles the chant.
    const litany = await game.buyLitany()
    expect(litany.ok).toBe(true)
    expect(game.chantPower()).toBe(3)   // 2 × 1.5 → round(3)

    // The Veil pays at low sanity…
    game.adjustSanity(-60)              // sanity 40
    expect(game.chantPower()).toBeGreaterThan(3)

    // …and lucidity costs a tithe.
    const homeBefore = (await game.listCells()).find(c => c.id === cu.cellId)!.devotion
    const r = game.riteOfLucidity()
    expect(r.ok).toBe(true)
    expect(r.tithe).toBeGreaterThan(0)
    const homeAfter = (await game.listCells()).find(c => c.id === cu.cellId)!.devotion
    expect(homeBefore - homeAfter).toBe(r.tithe)
    expect((await game.me())!.sanity).toBeGreaterThan(40)

    vi.useRealTimers()
  })
})
