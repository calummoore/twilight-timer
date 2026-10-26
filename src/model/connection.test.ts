import { describe, expect, it } from 'vitest'
import { codeOfPath, joinLink, joinPath } from './code'
import {
  LIVE_MS,
  checkBuild,
  isLive,
  nextOffset,
  retryDelay,
} from './connection'
import type { KeyValueStore } from './storage'
import { gameSummary, lastActivity } from './summary'
import { BUILD, OLD_BUILD } from './test-room'
import { memoryStore } from './test-store'
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

describe('the build check of a page', () => {
  // The page runs OLD_BUILD, and the server runs BUILD after a deploy.
  it('goes on while the page runs the build of the server', () => {
    const store = memoryStore()
    expect(checkBuild(store, BUILD, BUILD)).toBe('same')
    expect(store.data.size).toBe(0)
  })

  it('reloads once, then stops when the reload brings the same old page', () => {
    const store = memoryStore()
    expect(checkBuild(store, OLD_BUILD, BUILD)).toBe('reload')
    // The guard survives the reload, as sessionStorage does.
    expect(checkBuild(store, OLD_BUILD, BUILD)).toBe('outdated')
    expect(checkBuild(store, OLD_BUILD, BUILD)).toBe('outdated')
  })

  it('reloads again for each newer build of the server', () => {
    const store = memoryStore()
    expect(checkBuild(store, OLD_BUILD, BUILD)).toBe('reload')
    // Another deploy came before the reloaded page heard from the server.
    expect(checkBuild(store, BUILD, 'c4d5e6f')).toBe('reload')
  })

  it('clears the guard when the page runs the build of the server', () => {
    const store = memoryStore()
    expect(checkBuild(store, OLD_BUILD, BUILD)).toBe('reload')
    expect(checkBuild(store, BUILD, BUILD)).toBe('same')
    expect(store.data.size).toBe(0)
    // A later deploy reloads the page again, also back to the older build.
    expect(checkBuild(store, BUILD, OLD_BUILD)).toBe('reload')
  })

  it('reloads once for a server that names no build', () => {
    const store = memoryStore()
    expect(checkBuild(store, BUILD, null)).toBe('reload')
    expect(checkBuild(store, BUILD, null)).toBe('outdated')
  })

  it('stops at once when the store cannot keep the guard', () => {
    const blocked: KeyValueStore = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
    expect(checkBuild(blocked, OLD_BUILD, BUILD)).toBe('outdated')
    expect(checkBuild(blocked, BUILD, BUILD)).toBe('same')
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

  it('opens the game at its own site, and reads out without the scheme', () => {
    expect(joinLink('https://ti4.nexus', '7QK2HN')).toEqual({
      url: 'https://ti4.nexus/join/7QK2HN',
      text: 'ti4.nexus/join/7QK2HN',
    })
    expect(joinLink('http://localhost:5173', '7QK2HN')).toEqual({
      url: 'http://localhost:5173/join/7QK2HN',
      text: 'localhost:5173/join/7QK2HN',
    })
  })

  it('gives a link that opens the same game', () => {
    const { url } = joinLink('https://ti4.nexus', '7QK2HN')
    expect(codeOfPath(new URL(url).pathname)).toBe('7QK2HN')
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
