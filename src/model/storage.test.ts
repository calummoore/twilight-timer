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
  type KeyValueStore,
} from './storage'
import { PLAYERS, T0, table } from './test-table'

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

describe('storage', () => {
  it('saves and loads a game with its whole log', () => {
    const store = memoryStore()
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.pause()
    saveGame(store, t.game)
    expect(loadGame(store)).toEqual({ status: 'ok', game: t.game })
  })

  it('reports nothing saved, broken JSON, and data of the wrong shape', () => {
    const store = memoryStore()
    expect(loadGame(store)).toEqual({ status: 'none' })
    store.data.set('ti4tempo.game.v1', '{not json')
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const broken = { ...game, actions: [{ kind: 'teleported', at: T0 }] }
    store.data.set('ti4tempo.game.v1', JSON.stringify(broken))
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
