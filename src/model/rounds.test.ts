import { describe, expect, it } from 'vitest'
import { LIMITS_ON, MIN, SEC, passAll, playStrategy, table } from './test-table'

function statusTable() {
  const t = table()
  playStrategy(t)
  passAll(t)
  return t
}

describe('status, agenda, and the next round', () => {
  it('ticks status steps and ends the round when the Custodians token is on Mecatol', () => {
    const t = statusTable()
    expect(t.act({ kind: 'statusStepToggled', step: 3 })).toBe(true)
    expect(t.view().view).toMatchObject({
      phase: 'status',
      steps: [false, false, false, true, false, false, false],
    })
    expect(t.act({ kind: 'statusStepToggled', step: 7 })).toBe(false)
    t.wait(2 * MIN)
    t.act({ kind: 'phaseStepped' })
    expect(t.view().view.phase).toBe('summary')
    expect(t.view().entries.at(-2)).toMatchObject({
      kind: 'status',
      durationMs: 2 * MIN,
    })
  })

  it('runs two agendas with a discussion clock and a clock for each voter', () => {
    const t = statusTable()
    t.act({ kind: 'custodiansSet', removed: true })
    t.act({ kind: 'phaseStepped' })
    t.wait(4 * MIN)
    t.act({ kind: 'votingOpened' })
    const view = t.view().view
    expect(view).toMatchObject({
      phase: 'agenda',
      agenda: 1,
      stage: 'voting',
      discussionMs: 4 * MIN,
    })
    expect(
      view.phase === 'agenda' && view.voters.map((v) => v.playerId),
    ).toEqual(['kira', 'tom', 'priya', 'sam', 'wren', 'jaz'])
    for (let i = 0; i < 6; i++) {
      t.wait((i + 1) * 10 * SEC)
      t.act({ kind: 'voteCast' })
    }
    const voted = t.view().view
    expect(voted).toMatchObject({ stage: 'resolving' })
    expect(
      voted.phase === 'agenda' && voted.voters.map((v) => v.durationMs),
    ).toEqual([10, 20, 30, 40, 50, 60].map((s) => s * SEC))
    t.act({ kind: 'agendaResolved' })
    expect(t.view().view).toMatchObject({ agenda: 2, stage: 'discussion' })
    t.act({ kind: 'agendaResolved' }) // resolves early, with no votes
    expect(t.view().view.phase).toBe('summary')
  })

  it('starts the next round with new picks, no passes, and the same speaker', () => {
    const t = statusTable()
    t.act({ kind: 'speakerMoved', playerId: 'sam' })
    t.act({ kind: 'phaseStepped' })
    t.act({ kind: 'phaseStepped' })
    const view = t.view()
    expect(view.round).toBe(2)
    expect(view.view).toMatchObject({
      phase: 'strategy',
      pickerId: 'sam',
      owners: {},
    })
    expect(view.speakerId).toBe('sam')
    expect(view.custodiansRemoved).toBe(false)
  })

  it('charges every moment of a round to exactly one entry', () => {
    const t = table(LIMITS_ON)
    playStrategy(t)
    t.wait(30 * SEC)
    t.act({ kind: 'strategyCardPlayed', card: 1 })
    t.wait(20 * SEC)
    t.act({ kind: 'reactionClosed' })
    t.wait(15 * SEC)
    t.act({ kind: 'turnEnded' })
    t.pause()
    t.wait(5 * MIN)
    t.resume()
    t.wait(10 * SEC)
    t.act({ kind: 'turnEnded' })
    t.wait(5 * SEC)
    t.undo()
    t.wait(25 * SEC)
    passAll(t)
    t.wait(2 * MIN)
    t.act({ kind: 'phaseStepped' })
    t.wait(MIN)
    const view = t.view()
    const total = view.entries.reduce((sum, e) => sum + e.durationMs, 0)
    expect(total).toBe(view.gameMs)
  })

  it('ends the game from any phase and stops every clock', () => {
    const t = table()
    playStrategy(t)
    t.wait(MIN)
    t.act({ kind: 'gameEnded' })
    const ended = t.view()
    t.wait(10 * MIN)
    expect(t.view().gameMs).toBe(ended.gameMs)
    expect(ended.view.phase).toBe('ended')
    expect(ended.entries.at(-1)).toMatchObject({
      kind: 'turn',
      durationMs: MIN,
      running: false,
    })
    expect(t.act({ kind: 'phaseStepped' })).toBe(false)
  })
})
