import { describe, expect, it } from 'vitest'
import { PICKS, SEC, passAll, playStrategy, table } from './test-table'

describe('strategy phase', () => {
  it('lets players pick in speaker order and times each pick', () => {
    const t = table()
    t.wait(12 * SEC)
    expect(t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })).toBe(true)
    t.wait(7 * SEC)
    const view = t.view()
    expect(view.view).toMatchObject({
      phase: 'strategy',
      pickerId: 'kira',
      owners: { 3: 'jaz' },
    })
    expect(view.timer).toMatchObject({
      kind: 'pick',
      playerId: 'kira',
      elapsedMs: 7 * SEC,
    })
    expect(view.entries[0]).toMatchObject({
      kind: 'pick',
      playerId: 'jaz',
      durationMs: 12 * SEC,
    })
  })

  it('rejects a pick out of turn and a card that is taken', () => {
    const t = table()
    expect(t.act({ kind: 'cardPicked', playerId: 'kira', card: 5 })).toBe(false)
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    expect(t.act({ kind: 'cardPicked', playerId: 'kira', card: 3 })).toBe(false)
    expect(t.act({ kind: 'cardPicked', playerId: 'kira', card: 9 })).toBe(false)
  })

  it('starts the action phase only after every player has picked', () => {
    const t = table()
    expect(t.act({ kind: 'phaseStepped' })).toBe(false)
    playStrategy(t)
    expect(t.view().view).toMatchObject({ phase: 'action', activeId: 'tom' })
  })

  it('charges the time after the last pick to the table', () => {
    const t = table()
    for (const id of t.view().pickOrder) {
      t.act({ kind: 'cardPicked', playerId: id, card: PICKS[id] ?? 0 })
    }
    t.wait(5 * SEC)
    t.act({ kind: 'phaseStepped' })
    expect(t.view().entries.at(-2)).toMatchObject({
      kind: 'table',
      phase: 'strategy',
      playerId: null,
      durationMs: 5 * SEC,
    })
  })

  it('adds a trade good to each unpicked card every round', () => {
    const t = table()
    const nextRound = (picks: Record<string, number>) => {
      playStrategy(t, picks)
      passAll(t)
      t.act({ kind: 'phaseStepped' }) // status to summary
      t.act({ kind: 'phaseStepped' }) // summary to the next round
    }
    nextRound(PICKS) // cards 6 and 8 stay unpicked
    expect(t.view().view).toMatchObject({ tradeGoods: { 1: 0, 6: 1, 8: 1 } })
    nextRound({ ...PICKS, kira: 6 }) // card 6 is picked, 5 and 8 are not
    expect(t.view().view).toMatchObject({ tradeGoods: { 5: 1, 6: 0, 8: 2 } })
  })

  it('moves the pick clock to the new first picker when the speaker moves', () => {
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.wait(4 * SEC)
    t.act({ kind: 'speakerMoved', playerId: 'tom' })
    const view = t.view()
    expect(view.pickOrder).toEqual([
      'tom',
      'priya',
      'sam',
      'wren',
      'jaz',
      'kira',
    ])
    expect(view.view).toMatchObject({ pickerId: 'tom' })
    expect(view.entries.at(-2)).toMatchObject({
      playerId: 'kira',
      durationMs: 4 * SEC,
    })
  })
})
