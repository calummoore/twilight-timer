import { describe, expect, it } from 'vitest'
import { DEFAULT_LIMITS } from './settings'
import { LIMITS_ON, MIN, SEC, playStrategy, table } from './test-table'

function actionTable(settings = LIMITS_ON) {
  const t = table(settings)
  playStrategy(t)
  return t
}

describe('action phase', () => {
  it('runs turns in initiative order and charges each turn to its player', () => {
    const t = actionTable()
    const rail = t.view().view
    expect(rail.phase === 'action' && rail.rail.map((r) => r.playerId)).toEqual(
      ['tom', 'wren', 'jaz', 'sam', 'kira', 'priya'],
    )
    t.wait(30 * SEC)
    t.act({ kind: 'turnEnded' })
    t.wait(45 * SEC)
    const view = t.view()
    expect(view.view).toMatchObject({ activeId: 'wren', turnNumber: 1 })
    expect(view.timer).toMatchObject({
      kind: 'turn',
      playerId: 'wren',
      elapsedMs: 45 * SEC,
    })
    expect(view.entries.at(-2)).toMatchObject({
      kind: 'turn',
      playerId: 'tom',
      durationMs: 30 * SEC,
    })
  })

  it('skips passed players and gives the last player consecutive turns', () => {
    const t = actionTable()
    for (let i = 0; i < 5; i++) t.act({ kind: 'passed' }) // all but Priya
    expect(t.view().view).toMatchObject({ activeId: 'priya', passedCount: 5 })
    t.act({ kind: 'turnEnded' })
    expect(t.view().view).toMatchObject({ activeId: 'priya' })
    const row = (id: string) => {
      const v = t.view().view
      return v.phase === 'action'
        ? v.rail.find((r) => r.playerId === id)
        : undefined
    }
    expect(row('tom')).toMatchObject({ state: 'passed', turns: 1 })
    expect(row('priya')).toMatchObject({ state: 'active', turns: 2 })
  })

  it('starts the status phase when the last player passes', () => {
    const t = actionTable()
    for (let i = 0; i < 6; i++) t.act({ kind: 'passed' })
    const view = t.view()
    expect(view.view.phase).toBe('status')
    expect(view.timer).toMatchObject({ kind: 'status', playerId: null })
  })

  it('accepts a pass before the strategy card is played', () => {
    const t = actionTable()
    expect(t.view().view).toMatchObject({
      activeCards: [{ card: 1, played: false }],
    })
    expect(t.act({ kind: 'passed' })).toBe(true)
  })

  it('counts overtime only when the master switch and the limit are on', () => {
    const on = actionTable()
    on.wait(3 * MIN + 30 * SEC)
    expect(on.view().timer).toMatchObject({
      limitMs: 3 * MIN,
      elapsedMs: 210 * SEC,
    })
    on.act({ kind: 'turnEnded' })
    expect(on.view().entries.at(-2)).toMatchObject({
      limitMs: 3 * MIN,
      overtimeMs: 30 * SEC,
    })

    const off = actionTable({ ...LIMITS_ON, enforceLimits: false })
    off.wait(4 * MIN)
    off.act({ kind: 'turnEnded' })
    expect(off.view().entries.at(-2)).toMatchObject({
      limitMs: null,
      overtimeMs: 0,
    })
  })

  it('applies a limit change from its time on and keeps older entries', () => {
    const t = actionTable({ ...LIMITS_ON, enforceLimits: false })
    t.wait(4 * MIN)
    t.act({ kind: 'turnEnded' })
    t.wait(SEC)
    t.setLimits(true, { ...DEFAULT_LIMITS, turn: { on: true, ms: MIN } })
    t.wait(89 * SEC)
    t.act({ kind: 'turnEnded' })
    const turns = t
      .view()
      .entries.filter((e) => e.kind === 'turn' && !e.running)
    expect(turns.map((e) => e.overtimeMs)).toEqual([0, 30 * SEC])
  })
})
