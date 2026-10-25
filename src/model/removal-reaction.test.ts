import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import {
  LIMITS_ON,
  MIN,
  SEC,
  playStrategy,
  table,
  type Table,
} from './test-table'
import type { Entry } from './types'

/** Tom plays Leadership 10 seconds into the first turn. */
function openWindow(settings = DEFAULT_SETTINGS) {
  const t = table(settings)
  playStrategy(t)
  t.wait(10 * SEC)
  t.act({ kind: 'strategyCardPlayed' })
  return t
}

function reaction(t: Table) {
  const view = t.view().view
  return view.phase === 'action' ? view.reaction : null
}

function actionEntries(t: Table): Entry[] {
  return t.view().entries.filter((e) => e.phase === 'action')
}

function total(entries: Entry[]): number {
  return entries.reduce((sum, e) => sum + e.durationMs, 0)
}

describe('a player who leaves during a reaction window', () => {
  it('counts as done, and the window waits for the others', () => {
    const t = openWindow()
    t.wait(5 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'sam' })
    expect(reaction(t)?.tiles.find((tile) => tile.playerId === 'sam')).toEqual({
      playerId: 'sam',
      passed: false,
      left: true,
      tookMs: 5 * SEC,
    })
    expect(reaction(t)).toMatchObject({ doneCount: 1, pausedTurnMs: 10 * SEC })
    for (const id of ['wren', 'jaz', 'kira', 'priya']) {
      t.act({ kind: 'reactionDone', playerId: id })
    }
    expect(reaction(t)).toBeNull()
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 10 * SEC,
    })
  })

  it('closes the window when they are the last player it waits for', () => {
    const t = openWindow()
    for (const id of ['wren', 'jaz', 'kira', 'priya']) {
      t.act({ kind: 'reactionDone', playerId: id })
    }
    t.wait(8 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'sam' })
    expect(reaction(t)).toBeNull()
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 10 * SEC,
    })
    expect(actionEntries(t).find((e) => e.kind === 'reaction')).toMatchObject({
      durationMs: 8 * SEC,
      reactions: expect.arrayContaining([
        { playerId: 'sam', tookMs: 8 * SEC, marked: true },
      ]),
    })
  })

  it('ends the turn of the card player, and the next turn starts at the close', () => {
    const t = openWindow()
    t.wait(5 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    expect(reaction(t)).toMatchObject({ byId: 'tom', pausedTurnMs: 0 })
    t.wait(15 * SEC)
    t.act({ kind: 'reactionClosed' })
    t.wait(4 * SEC)
    const view = t.view()
    expect(view.view).toMatchObject({ activeId: 'wren', reaction: null })
    expect(view.timer).toMatchObject({ playerId: 'wren', elapsedMs: 4 * SEC })
    expect(actionEntries(t)).toMatchObject([
      { kind: 'turn', playerId: 'tom', durationMs: 10 * SEC, running: false },
      { kind: 'reaction', durationMs: 20 * SEC, card: 1, running: false },
      { kind: 'turn', playerId: 'wren', durationMs: 4 * SEC, running: true },
    ])
    expect(total(view.entries)).toBe(view.gameMs)
  })

  it('starts the next turn when the window of a card player who left closes itself', () => {
    const t = openWindow(LIMITS_ON) // the window limit is 2:00
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    t.wait(2 * MIN + 30 * SEC)
    expect(t.view().timer).toMatchObject({
      playerId: 'wren',
      elapsedMs: 30 * SEC,
    })
    t.act({ kind: 'turnEnded' })
    expect(t.view().view).toMatchObject({ activeId: 'jaz' })
    expect(actionEntries(t).filter((e) => !e.running)).toMatchObject([
      { kind: 'turn', playerId: 'tom', durationMs: 10 * SEC },
      { kind: 'reaction', durationMs: 2 * MIN },
      { kind: 'turn', playerId: 'wren', durationMs: 30 * SEC },
    ])
  })

  it('starts no new turn when the game ends in the window of a card player who left', () => {
    const t = openWindow()
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    t.wait(20 * SEC)
    t.act({ kind: 'gameEnded' })
    const view = t.view()
    expect(view.view.phase).toBe('ended')
    expect(actionEntries(t)).toMatchObject([
      { kind: 'turn', playerId: 'tom', durationMs: 10 * SEC },
      { kind: 'reaction', durationMs: 20 * SEC },
    ])
    expect(actionEntries(t)).toHaveLength(2)
    expect(total(view.entries)).toBe(view.gameMs)
  })

  it('reopens the window as it was when the removal is undone', () => {
    const t = openWindow()
    t.wait(5 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    t.wait(15 * SEC)
    t.undo()
    expect(reaction(t)).toMatchObject({
      byId: 'tom',
      elapsedMs: 5 * SEC,
      pausedTurnMs: 10 * SEC,
    })
    expect(t.view().seated).toContain('tom')
  })
})
