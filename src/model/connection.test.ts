import { describe, expect, it } from 'vitest'
import { codeOfPath, joinPath } from './code'
import { nextOffset, retryDelay } from './connection'
import { gameSummary, lastActivity } from './summary'
import { MIN, SEC, T0, playStrategy, table } from './test-table'

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

  it('waits longer after each failed try, up to a limit', () => {
    expect([0, 1, 2, 3, 4, 5, 50].map(retryDelay)).toEqual([
      500, 1000, 2000, 4000, 8000, 8000, 8000,
    ])
    expect(retryDelay(-1)).toBe(500)
  })
})

describe('join links', () => {
  it('holds the code in the path, and reads it in any case', () => {
    expect(joinPath('7QK2HN')).toBe('/join/7QK2HN')
    expect(codeOfPath('/join/7QK2HN')).toBe('7QK2HN')
    expect(codeOfPath('/join/7qk2hn/')).toBe('7QK2HN')
    expect(codeOfPath('/join/7QK2H0')).toBeNull()
    expect(codeOfPath('/')).toBeNull()
    expect(codeOfPath('/join/7QK2HN/extra')).toBeNull()
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

  it('finds the last tap or pause of a game', () => {
    const t = table()
    expect(lastActivity(t.game)).toBe(T0)
    t.wait(MIN)
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    expect(lastActivity(t.game)).toBe(T0 + MIN)
    t.wait(MIN)
    t.pause()
    t.wait(MIN)
    t.resume()
    expect(lastActivity(t.game)).toBe(T0 + 3 * MIN)
  })
})
