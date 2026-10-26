import { describe, expect, it } from 'vitest'
import { derive } from './derive'
import gameV6 from './fixtures/game-v6.json'
import roomV1 from './fixtures/room-v1.json'
import roomV2 from './fixtures/room-v2.json'
import { parseGame } from './parse'
import { parseRoom } from './room-storage'
import { postGameStats } from './stats'
import { MIN, SEC } from './test-table'
import type { Game } from './types'

/**
 * Stored shapes as their builds wrote them. Each fixture holds the same
 * game, which the test table played on the build of that version: two
 * rounds with a reaction window, a rule check, an undo, the Naalu token, a
 * player who leaves, and a change of the limits. A version bump keeps the
 * fixture of the old shape, so its upgrade steps run on what a build really
 * stored.
 */

/** The time at which the capturing build read the clocks. */
const AT = 1_700_001_935_000

/** The clocks of the game at AT, as the capturing build showed them. */
const CLOCKS = {
  round: 2,
  phase: 'action',
  gameMs: 31 * MIN + 7 * SEC,
  ruleCheckMs: 2 * MIN,
  turnMs: {
    kira: 5 * MIN + 15 * SEC,
    sam: 4 * MIN + 15 * SEC,
    tom: MIN + 45 * SEC,
    jaz: MIN + 30 * SEC,
    wren: 50 * SEC,
    priya: 40 * SEC,
  },
}

function clocksOf(game: Game | null | undefined) {
  if (!game) throw new Error('no game')
  const view = derive(game, AT)
  const stats = postGameStats(view)
  const turns = stats.players.map((p) => [p.playerId, p.turnMs])
  return {
    round: view.round,
    phase: view.view.phase,
    gameMs: view.gameMs,
    ruleCheckMs: stats.phases.ruleCheckMs,
    turnMs: Object.fromEntries(turns),
  }
}

describe('the stored shapes of older builds', () => {
  it('reads a game of version 6 with its clocks', () => {
    expect(clocksOf(parseGame(gameV6))).toEqual(CLOCKS)
  })

  it('reads a room of version 2 with its game and its devices', () => {
    const room = parseRoom(roomV2)
    expect(room).toMatchObject({ version: 2, revision: 63, creator: null })
    expect(room?.members.map((m) => [m.seat, m.admin])).toEqual([
      [null, true],
      ['jaz', false],
      ['kira', true],
    ])
    expect(clocksOf(room?.game)).toEqual(CLOCKS)
  })

  it('reads a room of version 1 in the newest shape', () => {
    const room = parseRoom(roomV1)
    expect(room).toMatchObject({ version: 2, revision: 62, creator: null })
    expect(room?.members).toEqual(parseRoom(roomV2)?.members)
    expect(clocksOf(room?.game)).toEqual(CLOCKS)
  })

  it('holds the same game in every fixture', () => {
    const game = parseGame(gameV6)
    expect(parseRoom(roomV1)?.game).toEqual(game)
    expect(parseRoom(roomV2)?.game).toEqual(game)
  })
})
