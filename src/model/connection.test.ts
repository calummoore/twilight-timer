import { describe, expect, it } from 'vitest'
import { LIVE_MS, isLive, nextOffset, retryDelay } from './connection'
import { gameSummary } from './summary'
import { SEC, T0, playStrategy, table } from './test-table'

describe('the connection', () => {
  it('keeps the offset of the fastest message, since the network only delays', () => {
    // The server clock is 5 s ahead. Messages take 300 ms, then 40 ms.
    let offset = nextOffset(null, T0 + 5 * SEC, T0 + 300)
    expect(offset).toBe(5 * SEC - 300)
    offset = nextOffset(offset, T0 + 6 * SEC, T0 + SEC + 40)
    expect(offset).toBe(5 * SEC - 40)
    offset = nextOffset(offset, T0 + 7 * SEC, T0 + 2 * SEC + 900)
    expect(offset).toBe(5 * SEC - 40)
  })

  it('counts a socket as live until its last sign of life is too old', () => {
    expect(isLive(T0, T0)).toBe(true)
    expect(isLive(T0, T0 + LIVE_MS)).toBe(true)
    expect(isLive(T0, T0 + LIVE_MS + 1)).toBe(false)
    // A ping every minute, as a hidden page sends, keeps a device live.
    expect(isLive(T0, T0 + 60 * SEC)).toBe(true)
  })

  it('waits longer after each failed try, up to a limit', () => {
    expect([0, 1, 2, 3, 4, 5, 50].map(retryDelay)).toEqual([
      500, 1000, 2000, 4000, 8000, 8000, 8000,
    ])
    expect(retryDelay(-1)).toBe(500)
  })
})

describe('the summary of a game', () => {
  it('names the players, the round, and the phase', () => {
    expect(gameSummary(null, 6)).toEqual({
      players: 6,
      round: 1,
      phase: 'lobby',
    })
    const t = table()
    expect(gameSummary(t.game, 6)).toEqual({
      players: 6,
      round: 1,
      phase: 'strategy',
    })
    playStrategy(t)
    t.act({ kind: 'gameEnded' })
    expect(gameSummary(t.game, 6)).toMatchObject({ phase: 'ended' })
  })
})
