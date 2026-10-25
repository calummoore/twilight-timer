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
  NAALU_PLAYERS,
  PLAYERS,
  SEC,
  T0,
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
    store.data.set('ti4tempo.game.v3', '{not json')
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const broken = { ...game, actions: [{ kind: 'teleported', at: T0 }] }
    store.data.set('ti4tempo.game.v3', JSON.stringify(broken))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
  })

  it('rejects a saved game with an unknown version or a broken pause', () => {
    const store = memoryStore()
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    store.data.set('ti4tempo.game.v3', JSON.stringify({ ...game, version: 4 }))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    store.data.set(
      'ti4tempo.game.v3',
      JSON.stringify({ ...game, version: '3' }),
    )
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const pauses = [{ from: T0, to: 'later' }]
    store.data.set('ti4tempo.game.v3', JSON.stringify({ ...game, pauses }))
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
    expect(game).toMatchObject({ version: 3, naaluTokenOwnerId: null })
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

  it('moves a version 1 game to the version 3 keys', () => {
    const store = memoryStore()
    const old = JSON.stringify(
      asVersion1(startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)),
    )
    store.data.set('ti4tempo.game.v1', old)
    store.data.set('ti4tempo.lastGame.v1', old)
    const game = gameOf(loadGame(store))
    expect(gameOf(loadLastGame(store))).toEqual(game)
    saveGame(store, game)
    expect(store.data.has('ti4tempo.game.v1')).toBe(false)
    expect(gameOf(loadGame(store))).toEqual(game)
    archiveGame(store)
    expect([...store.data.keys()]).toEqual(['ti4tempo.lastGame.v3'])
    expect(gameOf(loadLastGame(store))).toEqual(game)
  })

  it('loads a version 2 game as it was saved and moves it to the version 3 keys', () => {
    const store = memoryStore()
    const t = table(DEFAULT_SETTINGS, 'jaz', NAALU_PLAYERS)
    playStrategy(t)
    t.wait(30 * SEC)
    t.act({ kind: 'turnEnded' })
    const old = JSON.stringify({ ...t.game, version: 2 })
    store.data.set('ti4tempo.game.v2', old)
    store.data.set('ti4tempo.lastGame.v2', old)
    expect(gameOf(loadGame(store))).toEqual(t.game)
    expect(gameOf(loadLastGame(store))).toEqual(t.game)
    saveGame(store, t.game)
    archiveGame(store)
    expect([...store.data.keys()]).toEqual(['ti4tempo.lastGame.v3'])
  })

  it('rejects an unknown faction or token owner', () => {
    const store = memoryStore()
    const game = startGame(NAALU_PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const players = game.players.map((p) => ({ ...p, factionId: 'elves' }))
    store.data.set('ti4tempo.game.v3', JSON.stringify({ ...game, players }))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const owner = { ...game, naaluTokenOwnerId: 'zed' }
    store.data.set('ti4tempo.game.v3', JSON.stringify(owner))
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

  it('loads the expansions as saved, or each broken one as on', () => {
    const store = memoryStore()
    const key = 'ti4tempo.settings.v1'
    // Settings from a build before the expansions turn every expansion on.
    store.data.set(key, JSON.stringify({ enforceLimits: true }))
    expect(loadSettings(store)).toMatchObject({
      enforceLimits: true,
      expansions: { pok: true, te: true, keleres: true },
    })
    const chosen = { pok: true, te: false, keleres: false }
    saveSettings(store, { ...DEFAULT_SETTINGS, expansions: chosen })
    expect(loadSettings(store).expansions).toEqual(chosen)
    store.data.set(key, JSON.stringify({ expansions: 'all' }))
    expect(loadSettings(store).expansions).toEqual(DEFAULT_SETTINGS.expansions)
    // One broken value falls back alone. The other values load as saved.
    store.data.set(
      key,
      JSON.stringify({ expansions: { pok: false, te: 'no' } }),
    )
    expect(loadSettings(store).expansions).toEqual({
      pok: false,
      te: true,
      keleres: true,
    })
  })
})
