import { describe, expect, it } from 'vitest'
import { cardsEach } from './rules'
import { DEFAULT_SETTINGS } from './settings'
import {
  FOUR_PICKS,
  FOUR_PLAYERS,
  PLAYERS,
  SEC,
  passAll,
  playStrategy,
  table,
  type Table,
} from './test-table'

/** Speaker Jaz. The pick order is Jaz, Kira, Tom, Priya, then again. */
const FIRST = [3, 5, 1, 2]
const SECOND = [8, 6, 7, 4]
const ORDER = ['jaz', 'kira', 'tom', 'priya']

function fourTable(players = FOUR_PLAYERS) {
  return table(DEFAULT_SETTINGS, 'jaz', players)
}

function strategy(t: Table) {
  const view = t.view().view
  if (view.phase !== 'strategy') throw new Error(`phase ${view.phase}`)
  return view
}

/** Each player in `ids` picks the card at the same place in `cards`. */
function pick(t: Table, ids: string[], cards: number[]): void {
  ids.forEach((playerId, i) => {
    const card = cards[i] ?? 0
    expect(t.act({ kind: 'cardPicked', playerId, card })).toBe(true)
  })
}

/** Ends the round after the strategy phase, so the next round starts. */
function nextRound(t: Table): void {
  passAll(t)
  t.act({ kind: 'phaseStepped' }) // status to summary
  t.act({ kind: 'phaseStepped' }) // summary to the next strategy phase
}

describe('strategy phase with two cards each', () => {
  it('gives two cards each to three or four players, else one', () => {
    expect([3, 4, 5, 6, 7, 8].map(cardsEach)).toEqual([2, 2, 1, 1, 1, 1])
    expect(fourTable().view().cardsEach).toBe(2)
    expect(table().view().cardsEach).toBe(1)
  })

  it('picks twice round the pick order, from the speaker each time', () => {
    const t = fourTable()
    const pickers: (string | null)[] = []
    ORDER.concat(ORDER).forEach((playerId, i) => {
      pickers.push(strategy(t).pickerId)
      const card = [...FIRST, ...SECOND][i] ?? 0
      t.act({ kind: 'cardPicked', playerId, card })
    })
    expect(pickers).toEqual([...ORDER, ...ORDER])
    expect(strategy(t)).toMatchObject({
      pickerId: null,
      owners: { 1: 'tom', 2: 'priya', 3: 'jaz', 4: 'priya' },
    })
    expect(t.view().entries.filter((e) => e.kind === 'pick')).toHaveLength(8)
  })

  it('rejects a pick out of turn, a third card, and an early start', () => {
    const t = fourTable()
    expect(t.act({ kind: 'cardPicked', playerId: 'kira', card: 5 })).toBe(false)
    pick(t, ORDER, FIRST)
    // The second round starts with the speaker again.
    expect(t.act({ kind: 'cardPicked', playerId: 'kira', card: 6 })).toBe(false)
    pick(t, ORDER.slice(0, 3), SECOND)
    expect(t.act({ kind: 'phaseStepped' })).toBe(false)
    pick(t, ['priya'], [4])
    expect(t.act({ kind: 'phaseStepped' })).toBe(true)

    const three = fourTable(PLAYERS.slice(0, 3))
    pick(
      three,
      ['jaz', 'kira', 'tom', 'jaz', 'kira', 'tom'],
      [3, 5, 1, 8, 6, 7],
    )
    expect(strategy(three).pickerId).toBeNull()
    expect(three.act({ kind: 'cardPicked', playerId: 'jaz', card: 2 })).toBe(
      false,
    )
  })

  it('leaves no trade good with four players, and two with three', () => {
    const t = fourTable()
    playStrategy(t, FOUR_PICKS)
    nextRound(t)
    expect(Object.values(strategy(t).tradeGoods)).toEqual(Array(8).fill(0))

    const three = fourTable(PLAYERS.slice(0, 3))
    playStrategy(three, { jaz: [3, 8], kira: [5, 6], tom: [1, 7] })
    nextRound(three)
    expect(strategy(three).tradeGoods).toEqual({
      1: 0,
      2: 1,
      3: 0,
      4: 1,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
    })
  })

  it('shows the order so far by the lowest card of each player', () => {
    const t = fourTable()
    pick(t, ORDER, [8, 5, 7, 2])
    pick(t, ['jaz', 'kira'], [3, 6])
    expect(strategy(t).order).toEqual([
      { playerId: 'priya', initiative: 2 },
      { playerId: 'jaz', initiative: 3 },
      { playerId: 'kira', initiative: 5 },
      { playerId: 'tom', initiative: 7 },
    ])
  })

  it('moves the pick clock to the new first picker in the second round', () => {
    const t = fourTable()
    pick(t, ORDER, FIRST)
    pick(t, ['jaz'], [8])
    t.wait(4 * SEC)
    t.act({ kind: 'speakerMoved', playerId: 'tom' })
    const view = t.view()
    expect(view.pickOrder).toEqual(['tom', 'priya', 'jaz', 'kira'])
    // Jaz has both cards, so Tom picks next, not Kira.
    expect(strategy(t).pickerId).toBe('tom')
    expect(view.entries.at(-2)).toMatchObject({
      kind: 'pick',
      playerId: 'kira',
      durationMs: 4 * SEC,
    })
  })

  it('returns the clocks to a second pick when it is undone', () => {
    const t = fourTable()
    pick(t, ORDER, FIRST)
    t.wait(10 * SEC)
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 8 })
    t.wait(5 * SEC)
    t.undo()
    expect(strategy(t)).toMatchObject({ pickerId: 'jaz' })
    expect(strategy(t).owners[8]).toBeUndefined()
    expect(t.view().timer).toMatchObject({
      kind: 'pick',
      playerId: 'jaz',
      elapsedMs: 10 * SEC,
    })
  })
})
