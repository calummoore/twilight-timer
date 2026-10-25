import { describe, expect, it } from 'vitest'
import {
  PICKS,
  SEC,
  passAll,
  playStrategy,
  table,
  type Table,
} from './test-table'
import type { Entry } from './types'

/** Speaker Jaz. Initiative: Tom 1, Wren 2, Jaz 3, Sam 4, Kira 5, Priya 7. */

function activeId(t: Table): string | null {
  const view = t.view().view
  return view.phase === 'action' ? view.activeId : null
}

function rail(t: Table): string[] {
  const view = t.view().view
  return view.phase === 'action' ? view.rail.map((row) => row.playerId) : []
}

function total(entries: Entry[]): number {
  return entries.reduce((sum, e) => sum + e.durationMs, 0)
}

describe('a player who leaves the game', () => {
  it('leaves every order and keeps their recorded time', () => {
    const t = table()
    playStrategy(t)
    t.wait(30 * SEC)
    t.act({ kind: 'turnEnded' }) // Tom
    t.wait(20 * SEC)
    t.act({ kind: 'turnEnded' }) // Wren
    expect(t.act({ kind: 'playerRemoved', playerId: 'wren' })).toBe(true)
    const view = t.view()
    expect(view.seated).toEqual(['jaz', 'kira', 'tom', 'priya', 'sam'])
    expect(view.departures).toEqual([{ playerId: 'wren', round: 1 }])
    expect(view.pickOrder).toEqual(['jaz', 'kira', 'tom', 'priya', 'sam'])
    expect(view.voteOrder).toEqual(['kira', 'tom', 'priya', 'sam', 'jaz'])
    expect(rail(t)).toEqual(['tom', 'jaz', 'sam', 'kira', 'priya'])
    expect(view.entries.filter((e) => e.playerId === 'wren')).toMatchObject([
      { kind: 'pick', durationMs: 10 * SEC },
      { kind: 'turn', durationMs: 20 * SEC },
    ])
    const turns: (string | null)[] = []
    for (let i = 0; i < 5; i++) {
      turns.push(activeId(t))
      t.act({ kind: 'turnEnded' })
    }
    expect(turns).toEqual(['jaz', 'sam', 'kira', 'priya', 'tom'])
  })

  it('ends the turn of a player who leaves during it', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'turnEnded' }) // Tom
    t.act({ kind: 'turnEnded' }) // Wren
    t.act({ kind: 'turnEnded' }) // Jaz
    t.wait(30 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'sam' })
    t.wait(15 * SEC)
    const view = t.view()
    // The next turn counts on from Sam's place, not from the top.
    expect(view.view).toMatchObject({ activeId: 'kira', turnNumber: 1 })
    expect(view.timer).toMatchObject({ playerId: 'kira', elapsedMs: 15 * SEC })
    expect(view.entries.filter((e) => e.kind === 'turn')).toMatchObject([
      { playerId: 'tom', durationMs: 0 },
      { playerId: 'wren', durationMs: 0 },
      { playerId: 'jaz', durationMs: 0 },
      { playerId: 'sam', durationMs: 30 * SEC, running: false },
      { playerId: 'kira', durationMs: 15 * SEC, running: true },
    ])
    expect(total(view.entries)).toBe(view.gameMs)
  })

  it('starts the status phase when the last player to act leaves', () => {
    const t = table()
    playStrategy(t)
    for (let i = 0; i < 5; i++) t.act({ kind: 'passed' }) // all but Priya
    t.wait(20 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'priya' })
    const view = t.view()
    expect(view.view.phase).toBe('status')
    expect(view.entries.at(-2)).toMatchObject({
      kind: 'turn',
      playerId: 'priya',
      durationMs: 20 * SEC,
    })
  })

  it('counts only the players in the game who passed', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'passed' }) // Tom
    t.act({ kind: 'turnEnded' }) // Wren
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    expect(t.view().view).toMatchObject({ activeId: 'jaz', passedCount: 0 })
    expect(rail(t)).toHaveLength(5)
  })

  it('returns the card of a player who leaves in the strategy phase', () => {
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.act({ kind: 'cardPicked', playerId: 'kira', card: 5 })
    t.act({ kind: 'playerRemoved', playerId: 'kira' })
    expect(t.view().view).toMatchObject({
      pickerId: 'tom',
      owners: { 3: 'jaz' },
    })
    expect(t.act({ kind: 'cardPicked', playerId: 'tom', card: 5 })).toBe(true)
    for (const id of ['priya', 'sam', 'wren']) {
      t.act({ kind: 'cardPicked', playerId: id, card: PICKS[id] ?? 0 })
    }
    expect(t.act({ kind: 'phaseStepped' })).toBe(true)
    expect(rail(t)).toEqual(['wren', 'jaz', 'sam', 'tom', 'priya'])
  })

  it('puts a trade good only on a card that nobody holds after the picks', () => {
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.act({ kind: 'cardPicked', playerId: 'kira', card: 5 })
    t.act({ kind: 'playerRemoved', playerId: 'kira' }) // card 5 returns
    playStrategy(t) // the others take cards 1, 7, 4, and 2
    t.act({ kind: 'playerRemoved', playerId: 'wren' }) // Wren holds card 2
    passAll(t)
    t.act({ kind: 'phaseStepped' }) // status to summary
    t.act({ kind: 'phaseStepped' }) // summary to round 2
    expect(t.view().view).toMatchObject({
      phase: 'strategy',
      tradeGoods: { 2: 0, 3: 0, 5: 1, 6: 1, 8: 1 },
    })
  })

  it('moves the pick clock to the next player when the picker leaves', () => {
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.wait(4 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'kira' })
    t.wait(6 * SEC)
    const view = t.view()
    expect(view.view).toMatchObject({ pickerId: 'tom' })
    expect(view.timer).toMatchObject({ playerId: 'tom', elapsedMs: 6 * SEC })
    expect(view.entries.at(-2)).toMatchObject({
      kind: 'pick',
      playerId: 'kira',
      durationMs: 4 * SEC,
    })
  })

  it('moves the vote clock to the next voter when the voter leaves', () => {
    const t = table()
    playStrategy(t)
    passAll(t)
    t.act({ kind: 'custodiansSet', removed: true })
    t.act({ kind: 'phaseStepped' }) // the agenda phase
    t.act({ kind: 'votingOpened' })
    t.wait(10 * SEC)
    t.act({ kind: 'voteCast' }) // Kira
    t.wait(5 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    t.wait(7 * SEC)
    const view = t.view()
    const voters = view.view.phase === 'agenda' ? view.view.voters : []
    expect(voters.map((v) => [v.playerId, v.state])).toEqual([
      ['kira', 'done'],
      ['priya', 'now'],
      ['sam', 'waiting'],
      ['wren', 'waiting'],
      ['jaz', 'waiting'],
    ])
    expect(view.timer).toMatchObject({ playerId: 'priya', elapsedMs: 7 * SEC })
    expect(view.entries.filter((e) => e.kind === 'vote')).toMatchObject([
      { playerId: 'kira', durationMs: 10 * SEC },
      { playerId: 'tom', durationMs: 5 * SEC },
      { playerId: 'priya', running: true },
    ])
  })

  it('comes back with undo, and every clock returns to the removal', () => {
    const t = table()
    playStrategy(t)
    t.wait(30 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    t.wait(10 * SEC)
    t.undo()
    const view = t.view()
    expect(view.seated).toHaveLength(6)
    expect(view.departures).toEqual([])
    expect(view.timer).toMatchObject({ playerId: 'tom', elapsedMs: 30 * SEC })
    expect(rail(t)).toHaveLength(6)
  })

  it('gets their card back when a removal in the strategy phase is undone', () => {
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.act({ kind: 'cardPicked', playerId: 'kira', card: 5 })
    t.act({ kind: 'playerRemoved', playerId: 'kira' })
    t.undo()
    expect(t.view().view).toMatchObject({
      pickerId: 'tom',
      owners: { 3: 'jaz', 5: 'kira' },
    })
  })

  it('cannot leave twice, and the last player cannot leave', () => {
    const t = table()
    expect(t.act({ kind: 'playerRemoved', playerId: 'zed' })).toBe(false)
    for (const id of ['kira', 'tom', 'priya', 'sam', 'wren']) {
      expect(t.act({ kind: 'playerRemoved', playerId: id })).toBe(true)
    }
    expect(t.act({ kind: 'playerRemoved', playerId: 'kira' })).toBe(false)
    expect(t.act({ kind: 'playerRemoved', playerId: 'jaz' })).toBe(false)
    // The last player plays on alone.
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.act({ kind: 'phaseStepped' })
    expect(activeId(t)).toBe('jaz')
    t.act({ kind: 'turnEnded' })
    expect(activeId(t)).toBe('jaz')
    t.act({ kind: 'passed' })
    expect(t.view().view.phase).toBe('status')
  })

  it('cannot leave a game that has ended', () => {
    const t = table()
    t.act({ kind: 'gameEnded' })
    expect(t.act({ kind: 'playerRemoved', playerId: 'kira' })).toBe(false)
  })
})
