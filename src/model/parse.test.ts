import { describe, expect, it } from 'vitest'
import { startGame } from './commands'
import { derive } from './derive'
import { parseGame } from './parse'
import { DEFAULT_SETTINGS } from './settings'
import { cardlessLog, withNullCards } from './test-shapes'
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

/** A round trip through JSON, as the storage of the server gives it. */
const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

/** The game that the parser reads from stored data. Fails on a rejection. */
function read(stored: unknown): Game {
  const game = parseGame(wire(stored))
  if (!game) throw new Error('the parser rejected the game')
  return game
}

describe('the stored game', () => {
  it('reads a game with its whole log', () => {
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.act({ kind: 'playerRemoved', playerId: 'wren' })
    t.pause()
    expect(read(t.game)).toEqual(t.game)
  })

  it('reads the rule checks of each pause', () => {
    const t = table()
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(MIN)
    t.pauseReason(null)
    t.wait(MIN)
    t.resume()
    t.pause()
    t.pauseReason('ruleCheck') // still open when the server stores the game
    expect(t.game.pauses.flatMap((p) => p.reasons)).toHaveLength(2)
    expect(read(t.game)).toEqual(t.game)
  })

  it('drops a reason range that it cannot read, and keeps the game', () => {
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const kept = { reason: 'ruleCheck', from: T0 + 3 * MIN, to: T0 + 4 * MIN }
    const pauses = [
      { from: T0, to: T0 + MIN, reasons: [] },
      {
        from: T0 + 2 * MIN,
        to: T0 + 5 * MIN,
        reasons: [
          { reason: 'snack', from: T0 + 2 * MIN, to: T0 + 3 * MIN },
          { reason: 'ruleCheck', from: 'soon', to: null },
          kept,
        ],
      },
    ]
    expect(read({ ...game, pauses }).pauses).toEqual([
      { from: T0, to: T0 + MIN, reasons: [] },
      { from: T0 + 2 * MIN, to: T0 + 5 * MIN, reasons: [kept] },
    ])
  })

  it('rejects a pause without its list of reasons', () => {
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const broken = [
      { from: T0, to: T0 + MIN },
      { from: T0, to: T0 + MIN, reasons: 'none' },
    ]
    for (const pause of broken) {
      expect(parseGame(wire({ ...game, pauses: [pause] }))).toBeNull()
    }
  })

  it('rejects an unknown version, an unknown action, or a broken pause', () => {
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const broken = [
      { ...game, version: 8 },
      { ...game, version: '6' },
      { ...game, version: '7' },
      { ...game, actions: [{ kind: 'teleported', at: T0 }] },
      { ...game, pauses: [{ from: T0, to: 'later', reasons: [] }] },
      'game',
      null,
    ]
    for (const raw of broken) expect(parseGame(wire(raw))).toBeNull()
  })

  it('reads versions 6 and 7 only, so a game of version 1 to 5 is rejected', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed', card: 1 }) // Tom plays Leadership
    expect(read(t.game)).toEqual(t.game)
    // A build before seat swaps stored version 6, which has the same shape.
    expect(read({ ...t.game, version: 6 })).toEqual(t.game)
    for (const version of [1, 2, 3, 4, 5]) {
      expect(parseGame(wire({ ...t.game, version }))).toBeNull()
    }
  })

  it('rejects an unknown faction or token owner', () => {
    const game = startGame(NAALU_PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    const players = game.players.map((p) => ({ ...p, factionId: 'elves' }))
    expect(parseGame(wire({ ...game, players }))).toBeNull()
    const owner = { ...game, naaluTokenOwnerId: 'zed' }
    expect(parseGame(wire(owner))).toBeNull()
  })

  it('rejects a player without a faction', () => {
    const game = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    // JSON leaves out a field without a value, so the faction is missing.
    for (const factionId of [null, undefined]) {
      const players = game.players.map((p, i) =>
        i === 5 ? { ...p, factionId } : p,
      )
      expect(parseGame(wire({ ...game, players }))).toBeNull()
    }
  })

  it('rejects a game without a valid window rule', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed', card: 1 }) // Tom plays Leadership
    // JSON leaves out a field without a value, so the rule is missing.
    for (const windowEndsTurn of ['yes', undefined]) {
      expect(parseGame(wire({ ...t.game, windowEndsTurn }))).toBeNull()
    }
  })
})

describe('a stored game with the values of an older build', () => {
  it('keeps the window rule of its build: a window close resumes the turn', () => {
    const t = olderTable()
    playStrategy(t)
    t.wait(10 * SEC)
    t.act({ kind: 'strategyCardPlayed', card: 1 })
    t.act({ kind: 'reactionClosed' })
    t.wait(20 * SEC)
    t.act({ kind: 'turnEnded' })
    const game = read(withNullCards(t.game))
    expect(game).toMatchObject({ version: 7, windowEndsTurn: false })
    // The old build resumed Tom's turn after the window, so Tom ended it.
    const view = derive(game, T0 + 2 * MIN)
    expect(view.entries.filter((e) => e.kind === 'turn')).toMatchObject([
      { playerId: 'tom', durationMs: 30 * SEC },
      { playerId: 'wren', running: true },
    ])
  })

  it('plays the lowest card that is not played for a strategic action with no card', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed', card: 1 }) // Tom plays Leadership
    // Only a game from a build that gave each player one card has a null card.
    const game = read(withNullCards(t.game))
    expect(game).toEqual(withNullCards(t.game))
    // Each player had one card, so the window is for Tom's Leadership.
    expect(derive(game, T0 + 2 * MIN).view).toMatchObject({
      reaction: { card: 1, byId: 'tom' },
      activeCards: [{ card: 1, played: true }],
    })
    // A strategic action needs its card field, also when the card is null.
    const actions = cardlessLog(t.game)
    expect(parseGame(wire({ ...t.game, actions }))).toBeNull()
  })

  it('ends the turn at a window close when the game has the window rule', () => {
    const t = table()
    playStrategy(t)
    t.wait(10 * SEC)
    t.act({ kind: 'strategyCardPlayed', card: 1 })
    t.act({ kind: 'reactionClosed' }) // Tom's turn ends
    t.wait(20 * SEC)
    t.act({ kind: 'turnEnded' }) // Wren's turn ends
    const game = read(withNullCards(t.game))
    expect(game).toEqual(withNullCards(t.game))
    const view = derive(game, T0 + 2 * MIN)
    expect(view.entries.filter((e) => e.kind === 'turn')).toMatchObject([
      { playerId: 'tom', durationMs: 10 * SEC },
      { playerId: 'wren', durationMs: 20 * SEC },
      { playerId: 'jaz', running: true },
    ])
  })

  it('keeps card order when the game names no token owner', () => {
    const t = table(DEFAULT_SETTINGS, 'jaz', NAALU_PLAYERS)
    playStrategy(t)
    t.wait(30 * SEC)
    t.act({ kind: 'turnEnded' })
    // A build before the Naalu token stored no owner, and ran card order.
    const game = read({ ...t.game, naaluTokenOwnerId: null })
    expect(game.naaluTokenOwnerId).toBeNull()
    const view = derive(game, T0 + 90 * SEC)
    expect(view.entries.filter((e) => e.kind === 'turn')).toMatchObject([
      { playerId: 'tom', durationMs: 30 * SEC },
      { playerId: 'wren', running: true },
    ])
  })
})
