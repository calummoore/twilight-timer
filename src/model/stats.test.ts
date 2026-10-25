import { describe, expect, it } from 'vitest'
import { gameStats, playersOfRound, roundStats } from './stats'
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
  t.wait(MIN)
  t.act({ kind: 'strategyCardPlayed' })
  t.wait(30 * SEC)
  t.act({ kind: 'reactionClosed' })
  t.wait(3 * MIN)
  t.act({ kind: 'turnEnded' })
  t.wait(MIN)
  t.act({ kind: 'turnEnded' })
  passAll(t)
  t.wait(2 * MIN)
  t.act({ kind: 'phaseStepped' })
  return t
}

describe('rule checks in the stats', () => {
  it('adds rule checks to the game time as their own part', () => {
    const t = playedRound()
    t.act({ kind: 'gameEnded' })
    const entries = t.view().entries
    const without = gameStats(entries, IDS)
    const stats = gameStats(entries, IDS, 2 * MIN)
    expect(without.phases.ruleCheckMs).toBe(0)
    expect(stats.phases.ruleCheckMs).toBe(2 * MIN)
    expect(stats.totalMs).toBe(without.totalMs + 2 * MIN)
  })

  it('leaves rule checks out of the round length, and adds them to the game', () => {
    const t = table()
    playStrategy(t) // six picks, one minute
    t.wait(MIN)
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(5 * MIN)
    t.resume()
    passAll(t)
    t.act({ kind: 'gameEnded' })
    const view = t.view()
    expect(roundStats(view.entries, 1, IDS).lengthMs).toBe(2 * MIN)
    expect(view.gameMs).toBe(7 * MIN)
  })
})

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

  it('lists a player who left only in the rounds that they played', () => {
    const departures = [{ playerId: 'wren', round: 2 }]
    expect(playersOfRound(PLAYERS, departures, 1)).toEqual(IDS)
    expect(playersOfRound(PLAYERS, departures, 2)).toEqual(IDS)
    expect(playersOfRound(PLAYERS, departures, 3)).toEqual(
      IDS.filter((id) => id !== 'wren'),
    )
  })
})
