import { describe, expect, it } from 'vitest'
import { derive } from './derive'
import { DEFAULT_SETTINGS } from './settings'
import { archiveGame, loadGame, loadLastGame, saveGame } from './storage'
import {
  asBranchVersion4,
  asVersion1,
  asVersion2,
  asVersion3,
  asVersion4,
  gameOf,
  memoryStore,
} from './storage-fixtures'
import {
  MIN,
  NAALU_PLAYERS,
  SEC,
  T0,
  olderTable,
  playStrategy,
  table,
} from './test-table'

describe('games saved by older builds', () => {
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
      version: 5,
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

  it('loads a version 2 game as it was saved and moves it to the version 5 keys', () => {
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
    saveGame(store, saved)
    archiveGame(store)
    expect([...store.data.keys()]).toEqual(['ti4tempo.lastGame.v5'])
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
      t.act({ kind: 'strategyCardPlayed' })
      t.act({ kind: 'reactionClosed' })
      t.wait(20 * SEC)
      t.act({ kind: 'turnEnded' })
      store.data.set(`ti4tempo.game.v${version}`, JSON.stringify(shape(t.game)))
      const game = gameOf(loadGame(store))
      expect(game).toMatchObject({ version: 5, windowEndsTurn: false })
      // The old build resumed Tom's turn after the window, so he ended it.
      const view = derive(game, T0 + 2 * MIN)
      expect(view.entries.filter((e) => e.kind === 'turn')).toMatchObject([
        { playerId: 'tom', durationMs: 30 * SEC },
        { playerId: 'wren', running: true },
      ])
    },
  )

  it('keeps the window rule that a version 3 game of this change stored', () => {
    const store = memoryStore()
    const t = table()
    playStrategy(t)
    t.wait(10 * SEC)
    t.act({ kind: 'strategyCardPlayed' })
    t.act({ kind: 'reactionClosed' }) // Tom's turn ends
    t.wait(20 * SEC)
    t.act({ kind: 'turnEnded' }) // Wren's turn ends
    // Before main took version 3, this change saved its games as version 3.
    const early = JSON.stringify({ ...t.game, version: 3 })
    store.data.set('ti4tempo.game.v3', early)
    const game = gameOf(loadGame(store))
    expect(game).toEqual(t.game)
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
    ['3', asVersion3],
    ['4', asVersion4],
  ])(
    'loads a version %s game with no rule checks and moves it to the version 5 keys',
    (version, shape) => {
      const store = memoryStore()
      const t = olderTable()
      playStrategy(t)
      t.pause()
      t.wait(MIN)
      t.resume()
      const old = JSON.stringify(shape(t.game))
      store.data.set(`ti4tempo.game.v${version}`, old)
      store.data.set(`ti4tempo.lastGame.v${version}`, old)
      const game = gameOf(loadGame(store))
      expect(game.pauses).toEqual([
        { from: T0 + MIN, to: T0 + 2 * MIN, reasons: [] },
      ])
      expect(game).toEqual(t.game)
      expect(gameOf(loadLastGame(store))).toEqual(t.game)
      saveGame(store, game)
      archiveGame(store)
      expect([...store.data.keys()]).toEqual(['ti4tempo.lastGame.v5'])
    },
  )

  it('loads a version 4 game of the pause-reasons branch with its rule checks', () => {
    const store = memoryStore()
    const t = olderTable() // the branch's builds had the old window rule
    playStrategy(t)
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(MIN)
    t.resume()
    // Before main took version 4, the pause-reasons branch saved its games as
    // version 4, with rule checks and no window rule.
    store.data.set('ti4tempo.game.v4', JSON.stringify(asBranchVersion4(t.game)))
    const game = gameOf(loadGame(store))
    expect(game).toEqual(t.game)
    expect(game.pauses.flatMap((p) => p.reasons)).toHaveLength(1)
    saveGame(store, game)
    expect([...store.data.keys()]).toEqual(['ti4tempo.game.v5'])
  })

  it.each([
    ['1', asVersion1],
    ['2', asVersion2],
    ['3', asVersion3],
    ['4', asVersion4],
  ])('moves a version %s game to the version 5 keys', (version, shape) => {
    const store = memoryStore()
    const old = JSON.stringify(shape(olderTable().game))
    store.data.set(`ti4tempo.game.v${version}`, old)
    store.data.set(`ti4tempo.lastGame.v${version}`, old)
    const game = gameOf(loadGame(store))
    expect(gameOf(loadLastGame(store))).toEqual(game)
    saveGame(store, game)
    expect(store.data.has(`ti4tempo.game.v${version}`)).toBe(false)
    expect(gameOf(loadGame(store))).toEqual(game)
    archiveGame(store)
    expect([...store.data.keys()]).toEqual(['ti4tempo.lastGame.v5'])
    expect(gameOf(loadLastGame(store))).toEqual(game)
  })
})
