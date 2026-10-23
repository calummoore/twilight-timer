import { describe, expect, it } from 'vitest'
import { MIN, SEC, playStrategy, table } from './test-table'

function actionTable() {
  const t = table()
  playStrategy(t)
  return t
}

describe('undo', () => {
  it('returns every clock to its value at the undone tap', () => {
    const t = actionTable()
    t.wait(151 * SEC)
    t.act({ kind: 'turnEnded' }) // a mis-tap ends Tom's turn at 2:31
    t.wait(14 * SEC)
    const gameMsBefore = t.view().gameMs
    t.undo()
    const view = t.view()
    expect(view.view).toMatchObject({ activeId: 'tom' })
    expect(view.timer).toMatchObject({ playerId: 'tom', elapsedMs: 151 * SEC })
    expect(view.gameMs).toBe(gameMsBefore - 14 * SEC)
    expect(
      view.entries.some((e) => e.kind === 'turn' && e.playerId === 'wren'),
    ).toBe(false)
  })

  it('steps back further with each press', () => {
    const t = actionTable()
    t.wait(20 * SEC)
    t.act({ kind: 'turnEnded' })
    t.wait(20 * SEC)
    t.act({ kind: 'passed' })
    t.wait(20 * SEC)
    t.undo()
    t.undo()
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 20 * SEC,
    })
    expect(t.view().view).toMatchObject({ passedCount: 0 })
  })

  it('keeps the running clock when the undone tap did not change it', () => {
    const t = actionTable()
    t.act({ kind: 'speakerMoved', playerId: 'kira' })
    t.wait(30 * SEC)
    t.undo()
    expect(t.view().speakerId).toBe('jaz')
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 30 * SEC,
    })
  })

  it('reopens a reaction window that the last mark closed', () => {
    const t = actionTable()
    t.act({ kind: 'strategyCardPlayed' })
    for (const id of ['jaz', 'kira', 'priya', 'sam'])
      t.act({ kind: 'reactionDone', playerId: id })
    t.wait(8 * SEC)
    t.act({ kind: 'reactionDone', playerId: 'wren' })
    t.wait(5 * SEC)
    t.undo()
    expect(t.view().view).toMatchObject({
      reaction: { doneCount: 4, elapsedMs: 8 * SEC },
    })
  })

  it('does nothing with an empty log', () => {
    const t = table()
    const before = t.game
    t.undo()
    expect(t.game).toBe(before)
    expect(t.view().canUndo).toBe(false)
  })
})

describe('pause', () => {
  it('stops every clock and charges the pause to nobody', () => {
    const t = actionTable()
    const start = t.view().gameMs
    t.wait(MIN)
    t.pause()
    t.wait(10 * MIN)
    expect(t.view()).toMatchObject({ paused: true, canUndo: false })
    expect(t.view().timer).toMatchObject({ elapsedMs: MIN })
    t.resume()
    t.wait(MIN)
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 2 * MIN,
    })
    expect(t.view().gameMs).toBe(start + 2 * MIN)
  })

  it('ignores taps and undo while paused', () => {
    const t = actionTable()
    t.pause()
    expect(t.act({ kind: 'turnEnded' })).toBe(false)
    const before = t.game
    t.undo()
    expect(t.game).toBe(before)
  })
})
