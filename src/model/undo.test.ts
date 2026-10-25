import { describe, expect, it } from 'vitest'
import {
  LIMITS_ON,
  MIN,
  SEC,
  olderTable,
  playStrategy,
  table,
} from './test-table'

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

  it('returns the clocks to the tap also when the tap changed no clock', () => {
    const t = actionTable()
    t.wait(10 * SEC)
    t.act({ kind: 'speakerMoved', playerId: 'kira' })
    t.wait(30 * SEC)
    t.undo()
    expect(t.view().speakerId).toBe('jaz')
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 10 * SEC,
    })
  })

  it('reopens a reaction window that the last mark closed', () => {
    const t = actionTable()
    t.act({ kind: 'strategyCardPlayed' })
    for (const id of ['jaz', 'kira', 'priya', 'sam'])
      t.act({ kind: 'reactionDone', playerId: id })
    t.wait(8 * SEC)
    t.act({ kind: 'reactionDone', playerId: 'wren' })
    t.wait(5 * SEC) // the mark ended Tom's turn, so Wren's clock runs
    t.undo()
    const view = t.view()
    expect(view.view).toMatchObject({
      activeId: 'tom',
      reaction: { doneCount: 4, elapsedMs: 8 * SEC },
    })
    expect(
      view.entries.some((e) => e.kind === 'turn' && e.playerId === 'wren'),
    ).toBe(false)
  })

  it('restores an open reaction window when an extension is undone late', () => {
    const t = table(LIMITS_ON) // the window limit is 2:00
    playStrategy(t)
    t.wait(10 * SEC)
    t.act({ kind: 'strategyCardPlayed' })
    t.wait(110 * SEC)
    t.act({ kind: 'reactionExtended', ms: MIN })
    t.wait(20 * SEC) // past the old 2:00 end
    t.undo()
    expect(t.view().view).toMatchObject({
      reaction: {
        elapsedMs: 110 * SEC,
        limitMs: 2 * MIN,
        turnMs: 10 * SEC,
      },
    })
  })

  it('reopens the game when the game end is undone', () => {
    const t = actionTable()
    t.wait(MIN)
    t.act({ kind: 'gameEnded' })
    const ended = t.view().gameMs
    t.wait(10 * MIN)
    t.undo()
    const view = t.view()
    expect(view.view).toMatchObject({ phase: 'action', activeId: 'tom' })
    expect(view.timer).toMatchObject({ playerId: 'tom', elapsedMs: MIN })
    expect(view.gameMs).toBe(ended)
  })

  it('returns the clocks to the tap across a pause', () => {
    const t = actionTable()
    t.wait(20 * SEC)
    const atTap = t.view().gameMs
    t.act({ kind: 'turnEnded' })
    t.wait(5 * SEC)
    t.pause()
    t.wait(10 * MIN)
    t.resume()
    t.wait(5 * SEC)
    t.undo()
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 20 * SEC,
    })
    expect(t.view().gameMs).toBe(atTap)
  })

  it('keeps a window closed when a later tap is undone, in an older game', () => {
    const t = olderTable(LIMITS_ON) // the window closes itself at 2:00
    playStrategy(t)
    t.wait(10 * SEC)
    t.act({ kind: 'strategyCardPlayed' })
    t.wait(3 * MIN) // the window closes at 2:00, then Tom's turn runs 1:00
    t.act({ kind: 'turnEnded' })
    t.wait(10 * SEC)
    t.undo()
    expect(t.view().view).toMatchObject({ activeId: 'tom', reaction: null })
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 70 * SEC,
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
