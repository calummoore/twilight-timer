import { describe, expect, it } from 'vitest'
import { gameStats, roundStats } from './stats'
import {
  LIMITS_ON,
  MIN,
  PLAYERS,
  SEC,
  passAll,
  playStrategy,
  table,
} from './test-table'

const IDS = PLAYERS.map((p) => p.id)

/** Round 1: Tom 4:00 with Leadership, Wren 1:00, then all pass. */
function playedRound() {
  const t = table(LIMITS_ON)
  playStrategy(t, undefined, 10 * SEC) // six picks, one minute in total
  t.wait(4 * MIN)
  t.act({ kind: 'strategyCardPlayed' })
  t.wait(30 * SEC)
  t.act({ kind: 'reactionClosed' }) // Tom's turn ends
  t.wait(MIN)
  t.act({ kind: 'turnEnded' })
  passAll(t)
  t.wait(2 * MIN)
  t.act({ kind: 'phaseStepped' })
  return t
}

describe('stats', () => {
  it('splits a round into phases and players', () => {
    const t = playedRound()
    const stats = roundStats(t.view().entries, 1, IDS)
    expect(stats).toMatchObject({
      strategyMs: MIN,
      actionMs: 5 * MIN,
      reactionMs: 30 * SEC,
      reactionCount: 1,
      statusMs: 2 * MIN,
      lengthMs: 8 * MIN + 30 * SEC,
      overtimeMs: MIN,
      overLimitCount: 1,
    })
    expect(stats.players[0]).toMatchObject({
      playerId: 'tom',
      turnMs: 4 * MIN,
      turnOvertimeMs: MIN,
    })
    expect(stats.players.find((p) => p.playerId === 'jaz')).toMatchObject({
      reactionMs: 30 * SEC,
    })
  })

  it('keeps pick overtime out of the own-turn overtime', () => {
    const t = table(LIMITS_ON) // the pick limit is 0:45
    t.wait(105 * SEC)
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.act({ kind: 'gameEnded' })
    const jaz = gameStats(t.view().entries, IDS).players.find(
      (p) => p.playerId === 'jaz',
    )
    expect(jaz).toMatchObject({
      turnOvertimeMs: 0,
      limitOvertimeMs: MIN,
      overLimitCount: 1,
    })
  })

  it('totals the game per player and lists the longest turns', () => {
    const t = playedRound()
    t.act({ kind: 'gameEnded' })
    const stats = gameStats(t.view().entries, IDS)
    expect(stats).toMatchObject({
      rounds: 1,
      turns: 8,
      reactionCount: 1,
      overLimitCount: 1,
    })
    expect(stats.players[0]).toMatchObject({
      playerId: 'tom',
      turnMs: 4 * MIN,
      turns: 2,
      worstMs: 4 * MIN,
      share: 0.8,
    })
    expect(stats.longestTurns[0]).toMatchObject({
      playerId: 'tom',
      round: 1,
      card: 1,
    })
    expect(stats.longestRound).toEqual({
      round: 1,
      lengthMs: 8 * MIN + 30 * SEC,
    })
    expect(stats.phases).toMatchObject({
      turnsMs: 5 * MIN,
      statusMs: 2 * MIN,
      betweenMs: 0,
    })
  })
})
