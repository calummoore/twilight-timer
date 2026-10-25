import { describe, expect, it } from 'vitest'
import { startGame } from './commands'
import { DEFAULT_SETTINGS } from './settings'
import { archiveGame, loadGame, loadLastGame, saveGame } from './storage'
import {
  asPreviewVersion4,
  asPreviewVersion5,
  asVersion3,
  asVersion4,
  asVersion5,
  withNullCards,
} from './test-shapes'
import { gameOf, memoryStore } from './test-store'
import { MIN, PLAYERS, T0, olderTable, playStrategy, table } from './test-table'

describe('saved games and pause reasons', () => {
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
    store.data.set('ti4tempo.game.v6', JSON.stringify({ ...game, pauses }))
    expect(gameOf(loadGame(store)).pauses).toEqual([
      { from: T0, to: T0 + MIN, reasons: [] },
      { from: T0 + 2 * MIN, to: T0 + 5 * MIN, reasons: [kept] },
      { from: T0 + 6 * MIN, to: T0 + 7 * MIN, reasons: [] },
    ])
  })

  it.each([
    ['3', asVersion3],
    ['4', asVersion4],
    ['5', asVersion5],
  ])(
    'loads a version %s game with no rule checks and moves it to the version 6 keys',
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
      expect([...store.data.keys()]).toEqual(['ti4tempo.lastGame.v6'])
    },
  )

  it('loads a version 4 game that a preview of pause reasons saved', () => {
    const store = memoryStore()
    const t = olderTable() // that preview had the old window rule
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed', card: 1 }) // Tom plays Leadership
    t.act({ kind: 'reactionClosed' })
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(MIN)
    t.resume()
    // It stored rule checks, but no window rule and no card.
    store.data.set(
      'ti4tempo.game.v4',
      JSON.stringify(asPreviewVersion4(t.game)),
    )
    const game = gameOf(loadGame(store))
    expect(game).toEqual(withNullCards(t.game))
    expect(game.pauses.flatMap((p) => p.reasons)).toHaveLength(1)
    saveGame(store, game)
    expect([...store.data.keys()]).toEqual(['ti4tempo.game.v6'])
    expect(loadGame(store)).toEqual({ status: 'ok', game })
  })

  it('loads a version 5 game that a preview of pause reasons saved', () => {
    const store = memoryStore()
    const t = table() // that preview had the window rule
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed', card: 1 }) // Tom plays Leadership
    t.act({ kind: 'reactionClosed' }) // Tom's turn ends
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(MIN)
    t.resume()
    // It stored rule checks and the window rule, but no card.
    store.data.set(
      'ti4tempo.game.v5',
      JSON.stringify(asPreviewVersion5(t.game)),
    )
    const game = gameOf(loadGame(store))
    expect(game).toEqual(withNullCards(t.game))
    expect(game.pauses.flatMap((p) => p.reasons)).toHaveLength(1)
    saveGame(store, game)
    expect(loadGame(store)).toEqual({ status: 'ok', game })
  })
})
