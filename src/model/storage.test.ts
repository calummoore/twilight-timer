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
import { asVersion2, gameOf, memoryStore } from './storage-fixtures'
import { MIN, NAALU_PLAYERS, PLAYERS, T0, table } from './test-table'

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

  it('saves and loads the rule checks of each pause', () => {
    const store = memoryStore()
    const t = table()
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(MIN)
    t.pauseReason(null)
    t.wait(MIN)
    t.resume()
    t.pause()
    t.pauseReason('ruleCheck') // still open when the game saves
    saveGame(store, t.game)
    expect(t.game.pauses.flatMap((p) => p.reasons)).toHaveLength(2)
    expect(loadGame(store)).toEqual({ status: 'ok', game: t.game })
  })

  it('drops a reason range that it cannot read, and keeps the game', () => {
    const store = memoryStore()
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const kept = { reason: 'ruleCheck', from: T0 + 3 * MIN, to: T0 + 4 * MIN }
    const pauses = [
      { from: T0, to: T0 + MIN },
      {
        from: T0 + 2 * MIN,
        to: T0 + 5 * MIN,
        reasons: [
          { reason: 'snack', from: T0 + 2 * MIN, to: T0 + 3 * MIN },
          { reason: 'ruleCheck', from: 'soon', to: null },
          kept,
        ],
      },
      { from: T0 + 6 * MIN, to: T0 + 7 * MIN, reasons: 'none' },
    ]
    store.data.set('ti4tempo.game.v5', JSON.stringify({ ...game, pauses }))
    expect(gameOf(loadGame(store)).pauses).toEqual([
      { from: T0, to: T0 + MIN, reasons: [] },
      { from: T0 + 2 * MIN, to: T0 + 5 * MIN, reasons: [kept] },
      { from: T0 + 6 * MIN, to: T0 + 7 * MIN, reasons: [] },
    ])
  })

  it('rejects a version 5 game without a valid window rule', () => {
    const store = memoryStore()
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const broken = { ...game, windowEndsTurn: 'yes' }
    store.data.set('ti4tempo.game.v5', JSON.stringify(broken))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
    const missing = { ...asVersion2(game), version: 5 }
    store.data.set('ti4tempo.game.v5', JSON.stringify(missing))
    expect(loadGame(store)).toEqual({ status: 'invalid' })
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
