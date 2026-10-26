import { describe, expect, it } from 'vitest'
import { startGame } from './commands'
import { derive } from './derive'
import { DEFAULT_SETTINGS } from './settings'
import { forgetGame, forgetLastGame, loadGame, loadLastGame } from './storage'
import { onServer } from './test-room'
import { gameOf, memoryStore, storeGame } from './test-store'
import {
  asVersion1,
  asVersion2,
  asVersion3,
  asVersion4,
  asVersion5,
  cardlessLog,
  withNullCards,
} from './test-shapes'
import {
  FOUR_PICKS,
  FOUR_PLAYERS,
  MIN,
  NAALU_PLAYERS,
  PLAYERS,
  SEC,
  T0,
  olderTable,
  playStrategy,
  table,
} from './test-table'

describe('saved games of older versions', () => {
  it('loads a version 1 game with its typed factions and no token', () => {
    const store = memoryStore()
    const t = table(DEFAULT_SETTINGS, 'jaz', NAALU_PLAYERS)
    playStrategy(t)
    t.wait(30 * SEC)
    t.act({ kind: 'turnEnded' })
    const old = asVersion1(t.game)
    const typed = ['  federation of sol ', 'Embers of Muaat', 'arborec']
    const more = ['Emirates of Hacan', 'naalu', 'Space Elves']
    old.players.forEach((p, i) => (p.faction = [...typed, ...more][i] ?? ''))
    store.data.set('ti4tempo.game.v1', JSON.stringify(old))
    const game = gameOf(loadGame(store))
    expect(game).toMatchObject({
      version: 6,
      naaluTokenOwnerId: null,
      windowEndsTurn: false,
    })
    expect(game.players.map((p) => p.factionId)).toEqual([
      'sol',
      'muaat',
      'arborec',
      'hacan',
      'naalu',
      null,
    ])
    // The old build ran card order, so Tom took the first turn.
    const view = derive(game, T0 + 90 * SEC)
    expect(view.entries.filter((e) => e.kind === 'turn')).toMatchObject([
      { playerId: 'tom', durationMs: 30 * SEC },
      { playerId: 'wren', running: true },
    ])
  })

  it('loads a version 2 game as it was saved, and forgets it after the upload', () => {
    const store = memoryStore()
    const t = table(DEFAULT_SETTINGS, 'jaz', NAALU_PLAYERS)
    playStrategy(t)
    t.wait(30 * SEC)
    t.act({ kind: 'turnEnded' })
    const old = JSON.stringify(asVersion2(t.game))
    store.data.set('ti4tempo.game.v2', old)
    store.data.set('ti4tempo.lastGame.v2', old)
    // It keeps its token owner and the window rule of its build.
    const saved = { ...t.game, windowEndsTurn: false }
    expect(gameOf(loadGame(store))).toEqual(saved)
    expect(gameOf(loadLastGame(store))).toEqual(saved)
    forgetGame(store)
    forgetLastGame(store)
    expect(store.data.size).toBe(0)
  })

  it.each([
    ['2', asVersion2],
    ['3', asVersion3],
  ])(
    'loads a version %s game with the window rule of its build',
    (version, shape) => {
      const store = memoryStore()
      const t = olderTable()
      playStrategy(t)
      t.wait(10 * SEC)
      t.act({ kind: 'strategyCardPlayed', card: 1 })
      t.act({ kind: 'reactionClosed' })
      t.wait(20 * SEC)
      t.act({ kind: 'turnEnded' })
      store.data.set(`ti4tempo.game.v${version}`, JSON.stringify(shape(t.game)))
      const game = gameOf(loadGame(store))
      expect(game).toMatchObject({ version: 6, windowEndsTurn: false })
      // The old build resumed Tom's turn after the window, so he ended it.
      const view = derive(game, T0 + 2 * MIN)
      expect(view.entries.filter((e) => e.kind === 'turn')).toMatchObject([
        { playerId: 'tom', durationMs: 30 * SEC },
        { playerId: 'wren', running: true },
      ])
    },
  )

  it('keeps the window rule that a version 3 game of a preview stored', () => {
    const store = memoryStore()
    const t = table()
    playStrategy(t)
    t.wait(10 * SEC)
    t.act({ kind: 'strategyCardPlayed', card: 1 })
    t.act({ kind: 'reactionClosed' }) // Tom's turn ends
    t.wait(20 * SEC)
    t.act({ kind: 'turnEnded' }) // Wren's turn ends
    // A preview of the window rule saved its games as version 3.
    const early = { ...t.game, version: 3, actions: cardlessLog(t.game) }
    store.data.set('ti4tempo.game.v3', JSON.stringify(early))
    const game = gameOf(loadGame(store))
    expect(game).toEqual(withNullCards(t.game))
    const view = derive(game, T0 + 2 * MIN)
    expect(view.entries.filter((e) => e.kind === 'turn')).toMatchObject([
      { playerId: 'tom', durationMs: 10 * SEC },
      { playerId: 'wren', durationMs: 20 * SEC },
      { playerId: 'jaz', running: true },
    ])
    // A broken rule in an older game falls back to the old rule.
    const broken = { ...asVersion3(t.game), windowEndsTurn: 'yes' }
    store.data.set('ti4tempo.game.v3', JSON.stringify(broken))
    expect(gameOf(loadGame(store))).toMatchObject({ windowEndsTurn: false })
  })

  it.each([
    ['1', asVersion1],
    ['2', asVersion2],
    ['3', asVersion3],
    ['4', asVersion4],
    ['5', asVersion5],
  ])(
    'continues a version %s game on the server, and forgets it',
    (version, shape) => {
      const store = memoryStore()
      const old = JSON.stringify(shape(olderTable().game))
      store.data.set(`ti4tempo.game.v${version}`, old)
      store.data.set(`ti4tempo.lastGame.v${version}`, old)
      const game = gameOf(loadGame(store))
      expect(gameOf(loadLastGame(store))).toEqual(game)
      expect(onServer(game)).toEqual(game)
      forgetGame(store)
      expect(store.data.has(`ti4tempo.game.v${version}`)).toBe(false)
      expect(gameOf(loadLastGame(store))).toEqual(game)
      forgetLastGame(store)
      expect(store.data.size).toBe(0)
    },
  )

  it('rejects a version 4 to 6 game without a valid window rule', () => {
    const store = memoryStore()
    const t = table()
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed', card: 1 }) // Tom plays Leadership
    const game = t.game
    const empty = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const broken = [
      ['4', { ...asVersion4(empty), windowEndsTurn: 'yes' }],
      ['4', { ...asVersion4(game), windowEndsTurn: 'yes' }],
      ['5', { ...asVersion5(game), windowEndsTurn: 'yes' }],
      ['5', { ...asVersion2(game), version: 5 }],
      ['6', { ...game, windowEndsTurn: 'yes' }],
      ['6', { ...asVersion2(game), version: 6 }],
    ] as const
    for (const [version, data] of broken) {
      store.data.clear()
      store.data.set(`ti4tempo.game.v${version}`, JSON.stringify(data))
      expect(loadGame(store)).toEqual({ status: 'invalid' })
    }
  })

  it('loads a version 4 game that a preview of two cards each saved', () => {
    const store = memoryStore()
    const t = table(DEFAULT_SETTINGS, 'jaz', FOUR_PLAYERS)
    playStrategy(t, FOUR_PICKS)
    t.act({ kind: 'strategyCardPlayed', card: 7 }) // Tom plays Technology
    // That preview logged cards, stored no window rule, and resumed the turn.
    const early = { ...t.game, version: 4, windowEndsTurn: undefined }
    store.data.set('ti4tempo.game.v4', JSON.stringify(early))
    const game = gameOf(loadGame(store))
    expect(game).toEqual({ ...t.game, windowEndsTurn: false })
    expect(onServer(game)).toEqual(game)
  })

  it('loads a version 4 game, which logged no card for a strategic action', () => {
    const store = memoryStore()
    const t = table()
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed', card: 1 }) // Tom plays Leadership
    storeGame(store, t.game)
    expect(gameOf(loadGame(store))).toEqual(t.game)
    // A version 6 strategic action needs a card field. Only an upgraded game
    // from an older build holds a null card.
    const actions = cardlessLog(t.game)
    store.data.set('ti4tempo.game.v6', JSON.stringify({ ...t.game, actions }))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    store.data.delete('ti4tempo.game.v6')
    store.data.set('ti4tempo.game.v4', JSON.stringify(asVersion4(t.game)))
    const game = gameOf(loadGame(store))
    expect(game).toEqual(withNullCards(t.game))
    // Each player had one card, so the window is for Tom's Leadership.
    expect(derive(game, T0 + 2 * MIN).view).toMatchObject({
      reaction: { card: 1, byId: 'tom' },
      activeCards: [{ card: 1, played: true }],
    })
  })

  it('keeps an older game the same after the server stores it', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed', card: 1 }) // Tom plays Leadership
    const older = [
      ['v1', asVersion1(t.game)],
      ['v2', asVersion2(t.game)],
      ['v3', asVersion3(t.game)],
      ['v4', asVersion4(t.game)],
      ['v5', asVersion5(t.game)],
    ] as const
    for (const [key, old] of older) {
      const store = memoryStore()
      store.data.set(`ti4tempo.game.${key}`, JSON.stringify(old))
      const game = gameOf(loadGame(store))
      expect(onServer(game)).toEqual(game)
    }
  })
})
