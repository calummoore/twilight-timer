import { describe, expect, it } from 'vitest'
import { reasonTotals } from './pauses'
import { MIN, SEC, T0, playStrategy, table } from './test-table'
import type { Pause } from './types'

function actionTable() {
  const t = table()
  playStrategy(t)
  return t
}

describe('pause reasons', () => {
  it('starts every pause as a plain pause', () => {
    const t = actionTable()
    t.pause()
    expect(t.view().pause).toEqual({
      elapsedMs: 0,
      reason: null,
      reasonMs: null,
    })
    t.pauseReason('ruleCheck')
    t.wait(MIN)
    t.resume()
    t.pause()
    expect(t.view().pause).toMatchObject({ reason: null })
  })

  it('times a rule check from its tap to the tap on Pause', () => {
    const t = actionTable()
    t.pause()
    t.wait(10 * SEC) // the seconds before the tap stay a plain pause
    t.pauseReason('ruleCheck')
    t.wait(2 * MIN)
    expect(t.view().pause).toEqual({
      elapsedMs: 130 * SEC,
      reason: 'ruleCheck',
      reasonMs: 2 * MIN,
    })
    t.pauseReason(null)
    t.wait(MIN)
    expect(t.view().pause).toEqual({
      elapsedMs: 190 * SEC,
      reason: null,
      reasonMs: null,
    })
    expect(t.view().reasonTotals).toEqual([
      { reason: 'ruleCheck', ms: 2 * MIN, count: 1 },
    ])
  })

  it('ends an open rule check when the game resumes', () => {
    const t = actionTable()
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(90 * SEC)
    t.resume()
    const [stored] = t.game.pauses
    expect(stored?.reasons).toEqual([
      { reason: 'ruleCheck', from: stored?.from, to: stored?.to },
    ])
    t.wait(5 * MIN)
    expect(t.view().pause).toBeNull()
    expect(t.view().reasonTotals).toEqual([
      { reason: 'ruleCheck', ms: 90 * SEC, count: 1 },
    ])
  })

  it('counts two rule checks in one pause as two', () => {
    const t = actionTable()
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(MIN)
    t.pauseReason(null)
    t.wait(10 * MIN) // a break between the two rule checks
    t.pauseReason('ruleCheck')
    t.wait(30 * SEC)
    t.resume()
    expect(t.view().reasonTotals).toEqual([
      { reason: 'ruleCheck', ms: 90 * SEC, count: 2 },
    ])
  })

  it('ignores a reason while the game runs, and the reason that holds', () => {
    const t = actionTable()
    const running = t.game
    t.pauseReason('ruleCheck')
    expect(t.game).toBe(running)
    t.pause()
    const plain = t.game
    t.pauseReason(null)
    expect(t.game).toBe(plain)
    t.pauseReason('ruleCheck')
    const checking = t.game
    t.wait(SEC)
    t.pauseReason('ruleCheck')
    expect(t.game).toBe(checking)
  })

  it('moves no clock when the reason changes', () => {
    const t = actionTable()
    t.wait(MIN)
    t.pause()
    t.wait(20 * SEC)
    const before = t.view()
    t.pauseReason('ruleCheck')
    const after = t.view()
    expect(after.gameMs).toBe(before.gameMs)
    expect(after.timer).toEqual(before.timer)
    expect(after.entries).toEqual(before.entries)
    expect(after.pause?.elapsedMs).toBe(before.pause?.elapsedMs)
    t.wait(5 * MIN)
    t.resume()
    t.wait(MIN)
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 2 * MIN,
    })
  })

  it('totals rule checks only, with an open rule check up to now', () => {
    const t = actionTable()
    t.pause()
    t.wait(5 * MIN) // a plain pause counts nowhere
    t.resume()
    expect(t.view().reasonTotals).toEqual([
      { reason: 'ruleCheck', ms: 0, count: 0 },
    ])
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(45 * SEC)
    expect(t.view().reasonTotals).toEqual([
      { reason: 'ruleCheck', ms: 45 * SEC, count: 1 },
    ])
  })

  it('keeps a rule check when a later undo takes back the tap before it', () => {
    const t = actionTable()
    t.wait(20 * SEC)
    const atTap = t.view().gameMs
    t.act({ kind: 'turnEnded' })
    t.wait(5 * SEC)
    t.pause()
    t.pauseReason('ruleCheck') // the table checks whether the turn could end
    t.wait(3 * MIN)
    t.resume()
    t.undo()
    expect(t.view().gameMs).toBe(atTap)
    expect(t.view().timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 20 * SEC,
    })
    expect(t.view().reasonTotals).toEqual([
      { reason: 'ruleCheck', ms: 3 * MIN, count: 1 },
    ])
  })
})

describe('reason totals', () => {
  it('count a saved range only inside its pause', () => {
    const pauses: Pause[] = [
      {
        from: T0,
        to: T0 + MIN,
        reasons: [{ reason: 'ruleCheck', from: T0 - MIN, to: T0 + 2 * MIN }],
      },
      {
        from: T0 + 5 * MIN,
        to: T0 + 6 * MIN,
        reasons: [{ reason: 'ruleCheck', from: T0, to: T0 + MIN }],
      },
      {
        from: T0 + 10 * MIN,
        to: T0 + 12 * MIN,
        reasons: [{ reason: 'ruleCheck', from: T0 + 11 * MIN, to: null }],
      },
    ]
    expect(reasonTotals(pauses, T0 + 60 * MIN)).toEqual([
      { reason: 'ruleCheck', ms: 2 * MIN, count: 2 },
    ])
  })
})
