import { describe, expect, it } from 'vitest'
import {
  closeGame,
  leaveGame,
  loadGames,
  loadToken,
  openGame,
  saveGames,
  seeGame,
  type RecentGame,
} from './device-store'
import { memoryStore } from './test-store'
import { T0 } from './test-table'

const recent = (code: string, seenAt = T0): RecentGame => ({
  code,
  players: 6,
  round: 3,
  phase: 'action',
  seenAt,
})

describe('the games of this device', () => {
  it('keeps one token for the browser', () => {
    const store = memoryStore()
    let made = 0
    const make = () => `token-${String(++made).padStart(16, '0')}`
    const token = loadToken(store, make)
    expect(token).toBe('token-0000000000000001')
    expect(loadToken(store, make)).toBe(token)
    expect(made).toBe(1)
    store.data.set('ti4tempo.device.v1', 'short')
    expect(loadToken(store, make)).toBe('token-0000000000000002')
  })

  it('starts with no game, and reads what it saved', () => {
    const store = memoryStore()
    expect(loadGames(store)).toEqual({ current: null, recent: [] })
    const games = openGame(
      seeGame(loadGames(store), recent('7QK2HN')),
      '7QK2HN',
    )
    saveGames(store, games)
    expect(loadGames(store)).toEqual({
      current: '7QK2HN',
      recent: [recent('7QK2HN')],
    })
    expect(loadGames(store)).toEqual(games)
  })

  it('lists the games newest first, each once, and keeps twenty', () => {
    let games = loadGames(memoryStore())
    for (let i = 0; i < 25; i++) {
      games = seeGame(
        games,
        recent(`K8N3V${'23456789ABCDEFGHJKMNPQRST'[i]}`, T0 + i),
      )
    }
    expect(games.recent).toHaveLength(20)
    expect(games.recent[0]?.code).toBe('K8N3VT')
    games = seeGame(games, { ...recent('K8N3VJ'), round: 4 })
    expect(games.recent.map((g) => g.code).slice(0, 2)).toEqual([
      'K8N3VJ',
      'K8N3VT',
    ])
    expect(games.recent.filter((g) => g.code === 'K8N3VJ')).toHaveLength(1)
  })

  it('closes the open game, and forgets a game that it leaves', () => {
    const games = openGame(
      seeGame(
        seeGame(loadGames(memoryStore()), recent('K8N3VT')),
        recent('7QK2HN'),
      ),
      '7QK2HN',
    )
    expect(closeGame(games)).toEqual({ ...games, current: null })
    expect(leaveGame(games, '7QK2HN')).toEqual({
      current: null,
      recent: [recent('K8N3VT')],
    })
    expect(leaveGame(games, 'K8N3VT').current).toBe('7QK2HN')
  })

  it('drops a broken entry and keeps the rest', () => {
    const store = memoryStore()
    const good = recent('7QK2HN')
    store.data.set(
      'ti4tempo.games.v1',
      JSON.stringify({
        current: 'nope',
        recent: [
          good,
          { ...good, code: '0O0O0O' },
          { ...good, phase: 'nap' },
          7,
        ],
      }),
    )
    expect(loadGames(store)).toEqual({ current: null, recent: [good] })
    store.data.set('ti4tempo.games.v1', '{broken')
    expect(loadGames(store)).toEqual({ current: null, recent: [] })
  })
})
