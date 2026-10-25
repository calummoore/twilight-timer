import { describe, expect, it } from 'vitest'
import { startGame } from './commands'
import { DEFAULT_SETTINGS } from './settings'
import {
  archiveGame,
  loadGame,
  loadLastGame,
  loadSettings,
  saveGame,
  saveSettings,
} from './storage'
import { memoryStore } from './test-store'
import { NAALU_PLAYERS, PLAYERS, T0, table } from './test-table'

/** Games of older versions are in `storage-versions.test.ts`. */

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
    store.data.set('ti4tempo.game.v5', '{not json')
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const broken = { ...game, actions: [{ kind: 'teleported', at: T0 }] }
    store.data.set('ti4tempo.game.v5', JSON.stringify(broken))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
  })

  it('rejects a saved game with an unknown version or a broken pause', () => {
    const store = memoryStore()
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    store.data.set('ti4tempo.game.v5', JSON.stringify({ ...game, version: 6 }))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    store.data.set(
      'ti4tempo.game.v5',
      JSON.stringify({ ...game, version: '5' }),
    )
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const pauses = [{ from: T0, to: 'later' }]
    store.data.set('ti4tempo.game.v5', JSON.stringify({ ...game, pauses }))
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

  it('rejects an unknown faction or token owner', () => {
    const store = memoryStore()
    const game = startGame(NAALU_PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const players = game.players.map((p) => ({ ...p, factionId: 'elves' }))
    store.data.set('ti4tempo.game.v5', JSON.stringify({ ...game, players }))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const owner = { ...game, naaluTokenOwnerId: 'zed' }
    store.data.set('ti4tempo.game.v5', JSON.stringify(owner))
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
