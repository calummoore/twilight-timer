import { describe, expect, it } from 'vitest'
import { roundStats } from './stats'
import {
  LIMITS_ON,
  MIN,
  PLAYERS,
  SEC,
  olderTable,
  passAll,
  playStrategy,
  table,
  type Table,
} from './test-table'

const OTHERS = ['wren', 'jaz', 'sam', 'kira', 'priya']

/** Tom's turn runs 10 seconds, then he plays Leadership. The limit is 2:00. */
function playLeadership(t: Table = table(LIMITS_ON)): Table {
  playStrategy(t)
  t.wait(10 * SEC)
  t.act({ kind: 'strategyCardPlayed' })
  return t
}

function turns(t: Table) {
  return t.view().entries.filter((e) => e.kind === 'turn')
}

describe('a strategic action', () => {
  it('ends the turn when Mark all done closes the window', () => {
    const t = playLeadership()
    t.wait(30 * SEC)
    t.act({ kind: 'reactionClosed' })
    t.wait(5 * SEC)
    const view = t.view()
    expect(view.view).toMatchObject({
      activeId: 'wren',
      turnNumber: 1,
      reaction: null,
    })
    expect(view.timer).toMatchObject({
      kind: 'turn',
      playerId: 'wren',
      elapsedMs: 5 * SEC,
    })
    // Tom keeps the time before the card. The window is charged to nobody.
    expect(turns(t)).toMatchObject([
      { playerId: 'tom', durationMs: 10 * SEC, card: 1, running: false },
      { playerId: 'wren', durationMs: 5 * SEC, running: true },
    ])
    expect(view.entries.find((e) => e.kind === 'reaction')).toMatchObject({
      durationMs: 30 * SEC,
    })
  })

  it('ends the turn when the last player marks done', () => {
    const t = playLeadership()
    OTHERS.forEach((id) => {
      t.wait(6 * SEC)
      t.act({ kind: 'reactionDone', playerId: id })
    })
    expect(t.view().view).toMatchObject({ activeId: 'wren', reaction: null })
    expect(turns(t)).toMatchObject([
      { playerId: 'tom', durationMs: 10 * SEC, running: false },
      { playerId: 'wren', durationMs: 0, running: true },
    ])
  })

  it('gives the same player a new turn when everyone else has passed', () => {
    const t = table(LIMITS_ON)
    playStrategy(t)
    for (let i = 0; i < 5; i++) t.act({ kind: 'passed' }) // all but Priya
    t.wait(20 * SEC)
    t.act({ kind: 'strategyCardPlayed' }) // Priya plays Technology
    t.act({ kind: 'reactionClosed' })
    t.wait(5 * SEC)
    expect(t.view().view).toMatchObject({
      activeId: 'priya',
      turnNumber: 2,
      cardPlayed: true,
    })
    expect(t.view().timer).toMatchObject({
      playerId: 'priya',
      elapsedMs: 5 * SEC,
    })
  })

  it('returns every clock to the close when the close is undone', () => {
    const t = playLeadership()
    t.wait(30 * SEC)
    t.act({ kind: 'reactionClosed' })
    t.wait(20 * SEC) // Wren's clock runs
    t.undo()
    t.wait(5 * SEC)
    const view = t.view()
    expect(view.view).toMatchObject({
      activeId: 'tom',
      reaction: { elapsedMs: 35 * SEC, turnMs: 10 * SEC, doneCount: 0 },
    })
    expect(turns(t).map((e) => e.playerId)).toEqual(['tom'])
  })

  it('closes the window and the turn at a game end, and starts no turn', () => {
    const t = playLeadership()
    t.wait(30 * SEC)
    t.act({ kind: 'gameEnded' })
    const view = t.view()
    expect(view.view.phase).toBe('ended')
    expect(view.entries.slice(-2)).toMatchObject([
      { kind: 'reaction', durationMs: 30 * SEC, running: false },
      { kind: 'turn', playerId: 'tom', durationMs: 10 * SEC, running: false },
    ])
  })

  it('counts window overtime in the round stats', () => {
    const t = playLeadership()
    t.wait(2 * MIN + 45 * SEC)
    t.act({ kind: 'reactionClosed' })
    const stats = roundStats(
      t.view().entries,
      1,
      PLAYERS.map((p) => p.id),
    )
    expect(stats).toMatchObject({
      reactionMs: 165 * SEC,
      overtimeMs: 45 * SEC,
      overLimitCount: 1,
    })
  })

  it('charges every moment to one entry with a window past its limit', () => {
    const t = playLeadership()
    t.wait(3 * MIN) // a minute past the window limit
    t.act({ kind: 'reactionDone', playerId: 'jaz' })
    t.pause()
    t.wait(5 * MIN)
    t.resume()
    t.wait(20 * SEC)
    t.act({ kind: 'reactionClosed' })
    t.wait(40 * SEC)
    t.act({ kind: 'turnEnded' })
    t.wait(10 * SEC)
    t.undo()
    t.wait(15 * SEC)
    passAll(t)
    t.wait(MIN)
    const view = t.view()
    const total = view.entries.reduce((sum, e) => sum + e.durationMs, 0)
    expect(total).toBe(view.gameMs)
  })
})

describe('a strategic action in a game from an older build', () => {
  it('resumes the turn when the window closes', () => {
    const t = playLeadership(olderTable(LIMITS_ON))
    expect(t.view().view).toMatchObject({ reaction: { endsTurn: false } })
    t.wait(30 * SEC)
    t.act({ kind: 'reactionClosed' })
    t.wait(20 * SEC)
    expect(t.view().view).toMatchObject({ activeId: 'tom', reaction: null })
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 30 * SEC,
    })
  })

  it('closes the window itself when its limit passes', () => {
    const t = playLeadership(olderTable(LIMITS_ON))
    t.wait(MIN)
    expect(t.act({ kind: 'reactionExtended', ms: MIN })).toBe(true)
    t.wait(150 * SEC) // the window ends at 3:00, then Tom's turn runs 30 seconds
    expect(t.view().view).toMatchObject({ activeId: 'tom', reaction: null })
    expect(t.view().timer).toMatchObject({
      kind: 'turn',
      playerId: 'tom',
      elapsedMs: 40 * SEC,
    })
    expect(t.act({ kind: 'reactionDone', playerId: 'jaz' })).toBe(false)
  })
})
