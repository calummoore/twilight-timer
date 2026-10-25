import { describe, expect, it } from 'vitest'
import { startGame } from './commands'
import { derive } from './derive'
import { factionName } from './factions'
import { DEFAULT_SETTINGS } from './settings'
import {
  archiveGame,
  loadGame,
  loadLastGame,
  loadSettings,
  saveGame,
  saveSettings,
  type KeyValueStore,
  type LoadedGame,
} from './storage'
import {
  MIN,
  NAALU_PLAYERS,
  PLAYERS,
  SEC,
  T0,
  olderTable,
  playStrategy,
  table,
} from './test-table'
import type { Game } from './types'

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

/** The shape that builds before the Naalu token saved: typed factions. */
function asVersion1(game: Game) {
  return {
    version: 1,
    startedAt: game.startedAt,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      colour: p.colour,
      faction: factionName(p.factionId),
    })),
    firstSpeakerId: game.firstSpeakerId,
    actions: game.actions,
    pauses: game.pauses,
    voids: game.voids,
    limitsLog: game.limitsLog,
  }
}

/** The shape that builds before the window rule saved: no window rule. */
function asVersion2(game: Game) {
  return {
    version: 2,
    startedAt: game.startedAt,
    players: game.players,
    firstSpeakerId: game.firstSpeakerId,
    naaluTokenOwnerId: game.naaluTokenOwnerId,
    actions: game.actions,
    pauses: game.pauses,
    voids: game.voids,
    limitsLog: game.limitsLog,
  }
}

/** Version 3 has the version 2 shape. Its log can remove a player. */
function asVersion3(game: Game) {
  return { ...asVersion2(game), version: 3 }
}

function gameOf(loaded: LoadedGame): Game {
  if (loaded.status !== 'ok') throw new Error(`no game: ${loaded.status}`)
  return loaded.game
}

describe('storage', () => {
  it('saves and loads a game with its whole log', () => {
    const store = memoryStore()
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.act({ kind: 'playerRemoved', playerId: 'wren' })
    t.pause()
    saveGame(store, t.game)
    expect(loadGame(store)).toEqual({ status: 'ok', game: t.game })
  })

  it('reports nothing saved, broken JSON, and data of the wrong shape', () => {
    const store = memoryStore()
    expect(loadGame(store)).toEqual({ status: 'none' })
    store.data.set('ti4tempo.game.v4', '{not json')
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const broken = { ...game, actions: [{ kind: 'teleported', at: T0 }] }
    store.data.set('ti4tempo.game.v4', JSON.stringify(broken))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
  })

  it('rejects a saved game with an unknown version or a broken pause', () => {
    const store = memoryStore()
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    store.data.set('ti4tempo.game.v4', JSON.stringify({ ...game, version: 5 }))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    store.data.set(
      'ti4tempo.game.v4',
      JSON.stringify({ ...game, version: '4' }),
    )
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const pauses = [{ from: T0, to: 'later' }]
    store.data.set('ti4tempo.game.v4', JSON.stringify({ ...game, pauses }))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
  })

  it('keeps the archived game as the last game', () => {
    const store = memoryStore()
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    saveGame(store, game)
    archiveGame(store)
    expect(loadGame(store)).toEqual({ status: 'none' })
    expect(loadLastGame(store)).toEqual({ status: 'ok', game })
  })

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
      version: 4,
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

  it('loads a version 2 game as it was saved and moves it to the version 4 keys', () => {
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
    expect([...store.data.keys()]).toEqual(['ti4tempo.lastGame.v4'])
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
      expect(game).toMatchObject({ version: 4, windowEndsTurn: false })
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
    ['1', asVersion1],
    ['2', asVersion2],
    ['3', asVersion3],
  ])('moves a version %s game to the version 4 keys', (version, shape) => {
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
    expect([...store.data.keys()]).toEqual(['ti4tempo.lastGame.v4'])
    expect(gameOf(loadLastGame(store))).toEqual(game)
  })

  it('rejects a version 4 game without a valid window rule', () => {
    const store = memoryStore()
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const broken = { ...game, windowEndsTurn: 'yes' }
    store.data.set('ti4tempo.game.v4', JSON.stringify(broken))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const missing = { ...asVersion2(game), version: 4 }
    store.data.set('ti4tempo.game.v4', JSON.stringify(missing))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
  })

  it('rejects an unknown faction or token owner', () => {
    const store = memoryStore()
    const game = startGame(NAALU_PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const players = game.players.map((p) => ({ ...p, factionId: 'elves' }))
    store.data.set('ti4tempo.game.v4', JSON.stringify({ ...game, players }))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const owner = { ...game, naaluTokenOwnerId: 'zed' }
    store.data.set('ti4tempo.game.v4', JSON.stringify(owner))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
  })

  it('falls back to defaults for missing or broken settings', () => {
    const store = memoryStore()
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
    saveSettings(store, {
      ...DEFAULT_SETTINGS,
      enforceLimits: true,
      alarmSound: 'chime',
    })
    expect(loadSettings(store)).toMatchObject({
      enforceLimits: true,
      alarmSound: 'chime',
    })
    store.data.set(
      'ti4tempo.settings.v1',
      JSON.stringify({ alarmSound: 'kazoo', keepAwake: 'yes' }),
    )
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
  })
})
