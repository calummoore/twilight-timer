import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import {
  FOUR_PICKS,
  FOUR_PLAYERS,
  LIMITS_ON,
  MIN,
  PLAYERS,
  SEC,
  passAll,
  playStrategy,
  table,
  type Table,
} from './test-table'

/** Speaker Jaz. Initiative: Tom 1, Priya 2, Jaz 3, Kira 5. */
function fourTable(settings = DEFAULT_SETTINGS, players = FOUR_PLAYERS) {
  const t = table(settings, 'jaz', players)
  playStrategy(t, FOUR_PICKS)
  return t
}

function action(t: Table) {
  const view = t.view().view
  if (view.phase !== 'action') throw new Error(`phase ${view.phase}`)
  return view
}

/** Closes the open reaction window, then ends the turn. */
function endWindowAndTurn(t: Table): void {
  t.act({ kind: 'reactionClosed' })
  t.act({ kind: 'turnEnded' })
}

describe('action phase with two cards each', () => {
  it('gives each player one turn in each cycle, at their lowest card', () => {
    const t = fourTable()
    const turns: string[] = []
    for (let i = 0; i < 5; i++) {
      turns.push(action(t).activeId)
      t.act({ kind: 'turnEnded' })
    }
    expect(turns).toEqual(['tom', 'priya', 'jaz', 'kira', 'tom'])
    expect(action(t).rail).toMatchObject([
      { playerId: 'tom', initiative: 1, cards: [{ card: 1 }, { card: 7 }] },
      { playerId: 'priya', initiative: 2, cards: [{ card: 2 }, { card: 4 }] },
      { playerId: 'jaz', initiative: 3, cards: [{ card: 3 }, { card: 8 }] },
      { playerId: 'kira', initiative: 5, cards: [{ card: 5 }, { card: 6 }] },
    ])
  })

  it('puts the holder of the Naalu token first with both cards', () => {
    const players = FOUR_PLAYERS.map((p) =>
      p.id === 'kira' ? { ...p, factionId: 'naalu' as const } : p,
    )
    const t = fourTable(DEFAULT_SETTINGS, players)
    expect(action(t)).toMatchObject({
      activeId: 'kira',
      activeInitiative: 0,
      activeCards: [
        { card: 5, played: false },
        { card: 6, played: false },
      ],
    })
    expect(action(t).rail.map((row) => row.initiative)).toEqual([0, 1, 2, 3])
  })

  it('plays the chosen card, and each card once in a round', () => {
    const t = fourTable()
    expect(t.act({ kind: 'strategyCardPlayed', card: 2 })).toBe(false)
    expect(t.act({ kind: 'strategyCardPlayed', card: 7 })).toBe(true)
    expect(action(t).reaction).toMatchObject({ card: 7, byId: 'tom' })
    expect(action(t).activeCards).toEqual([
      { card: 1, played: false },
      { card: 7, played: true },
    ])
    endWindowAndTurn(t)
    for (let i = 0; i < 3; i++) t.act({ kind: 'turnEnded' }) // to Tom
    expect(t.act({ kind: 'strategyCardPlayed', card: 7 })).toBe(false)
    expect(t.act({ kind: 'strategyCardPlayed', card: 1 })).toBe(true)
    endWindowAndTurn(t)
    const turns = t.view().entries.filter((e) => e.playerId === 'tom')
    expect(turns.filter((e) => e.kind === 'turn').map((e) => e.card)).toEqual([
      7, 1,
    ])
    expect(action(t).rail[0]?.cards.every((c) => c.played)).toBe(true)
  })

  it('offers the new speaker when Politics is the second card', () => {
    const t = fourTable()
    t.act({ kind: 'turnEnded' }) // Tom
    t.act({ kind: 'turnEnded' }) // Priya
    t.act({ kind: 'strategyCardPlayed', card: 8 }) // Jaz plays Imperial
    expect(action(t).reaction).toMatchObject({ card: 8, speakerChoice: null })
    endWindowAndTurn(t)
    for (let i = 0; i < 3; i++) t.act({ kind: 'turnEnded' }) // to Jaz
    t.act({ kind: 'strategyCardPlayed', card: 3 })
    expect(action(t).reaction?.speakerChoice).toEqual({
      fromId: 'jaz',
      options: ['kira', 'tom', 'priya'],
      chosenId: null,
    })
  })

  it('accepts a pass before both cards are played', () => {
    const t = fourTable()
    t.act({ kind: 'strategyCardPlayed', card: 1 })
    endWindowAndTurn(t)
    for (let i = 0; i < 3; i++) t.act({ kind: 'turnEnded' }) // to Tom
    expect(action(t).activeCards.filter((c) => !c.played)).toEqual([
      { card: 7, played: false },
    ])
    expect(t.act({ kind: 'passed' })).toBe(true)
  })

  it('charges every moment of a four-player round to one entry', () => {
    const t = fourTable(LIMITS_ON)
    t.wait(30 * SEC)
    t.act({ kind: 'strategyCardPlayed', card: 7 })
    t.wait(20 * SEC)
    t.act({ kind: 'reactionClosed' })
    t.wait(15 * SEC)
    t.act({ kind: 'turnEnded' })
    t.wait(10 * SEC)
    t.act({ kind: 'strategyCardPlayed', card: 4 }) // Priya
    t.wait(3 * MIN) // the window closes itself at 2:00
    t.act({ kind: 'turnEnded' })
    t.wait(5 * SEC)
    t.undo()
    t.wait(25 * SEC)
    passAll(t)
    t.wait(MIN)
    const view = t.view()
    const total = view.entries.reduce((sum, e) => sum + e.durationMs, 0)
    expect(total).toBe(view.gameMs)
  })
})

describe('two cards and players who leave', () => {
  it('returns both cards of a player who leaves in the strategy phase', () => {
    const t = table(DEFAULT_SETTINGS, 'jaz', FOUR_PLAYERS)
    for (const [playerId, card] of [
      ['jaz', 3],
      ['kira', 5],
      ['tom', 1],
      ['priya', 2],
      ['jaz', 8],
    ] as const) {
      t.act({ kind: 'cardPicked', playerId, card })
    }
    t.act({ kind: 'playerRemoved', playerId: 'jaz' })
    const view = t.view().view
    expect(view).toMatchObject({
      phase: 'strategy',
      pickerId: 'kira',
      owners: { 1: 'tom', 2: 'priya', 5: 'kira' },
    })
    expect(view.phase === 'strategy' && view.owners[3]).toBeUndefined()
  })

  it('keeps the card count of the game start after a removal', () => {
    const five = table(DEFAULT_SETTINGS, 'jaz', PLAYERS.slice(0, 5))
    five.act({ kind: 'playerRemoved', playerId: 'sam' })
    expect(five.view().cardsEach).toBe(1)
    playStrategy(five, { jaz: 3, kira: 5, tom: 1, priya: 2 })
    expect(five.view().view.phase).toBe('action')

    const four = table(DEFAULT_SETTINGS, 'jaz', FOUR_PLAYERS)
    four.act({ kind: 'playerRemoved', playerId: 'priya' })
    playStrategy(four, { jaz: 3, kira: 5, tom: 1 })
    expect(four.view().view.phase).toBe('strategy')
    playStrategy(four, { jaz: 8, kira: 6, tom: 7 })
    expect(action(four).rail.map((row) => row.cards.length)).toEqual([2, 2, 2])
  })
})
