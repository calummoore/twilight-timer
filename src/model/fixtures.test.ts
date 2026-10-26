import { describe, expect, it } from 'vitest'
import { derive } from './derive'
import { foldGame } from './fold'
import gameV6 from './fixtures/game-v6.json'
import { parseGame } from './parse'
import { newRoom, parseRoom } from './room'
import { CODE, HOST, SETUP } from './test-room'
import { NAALU_PLAYERS, SEC, T0, playStrategy, table } from './test-table'
import { DEFAULT_SETTINGS } from './settings'

/**
 * Each fixture is a game that the test table played on the build before a
 * version bump, saved as that build stored it.
 */

/** A round trip through JSON, as storage and the socket give it. */
const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

describe('stored games of an older version', () => {
  it('loads the version 6 fixture as version 7, with its clocks', () => {
    const game = parseGame(gameV6)
    expect(game?.version).toBe(7)
    if (!game) return
    // Every tap of its log still applies.
    expect(foldGame(game).rejected).toEqual([])
    // Round 2: Kira holds the token, Wren left, and Tom picks.
    const view = derive(game, T0 + 1_007 * SEC)
    expect(view).toMatchObject({
      round: 2,
      speakerId: 'kira',
      seated: ['jaz', 'kira', 'tom', 'priya', 'sam'],
      departures: [{ playerId: 'wren', round: 2 }],
      gameMs: 942 * SEC,
      reasonTotals: [{ reason: 'ruleCheck', ms: 90 * SEC, count: 1 }],
      timer: { kind: 'pick', playerId: 'tom', elapsedMs: 50 * SEC },
    })
    // Round 1: the Naalu token put Sam first, Tom played Leadership, and the
    // undone turn end of Wren left no entry.
    const action = view.entries.filter(
      (e) => e.round === 1 && e.phase === 'action',
    )
    expect(action.slice(0, 4)).toMatchObject([
      { kind: 'turn', playerId: 'sam', durationMs: 30 * SEC },
      { kind: 'turn', playerId: 'tom', durationMs: 20 * SEC, card: 1 },
      { kind: 'reaction', playerId: null, durationMs: 20 * SEC, card: 1 },
      { kind: 'turn', playerId: 'wren', durationMs: 65 * SEC },
    ])
  })

  it('loads a version 6 game as version 7 with no other change', () => {
    const t = table(DEFAULT_SETTINGS, 'jaz', NAALU_PLAYERS)
    playStrategy(t)
    t.act({ kind: 'turnEnded' })
    const v6 = { ...t.game, version: 6 }
    expect(parseGame(wire(v6))).toEqual(t.game)
    // A stored room reads its version 6 game the same way.
    const room = { ...newRoom(CODE, SETUP, HOST), game: v6 }
    expect(parseRoom(wire(room))?.game).toEqual(t.game)
  })
})
