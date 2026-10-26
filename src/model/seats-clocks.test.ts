import { describe, expect, it } from 'vitest'
import { SEC, passAll, playStrategy, table, type Table } from './test-table'
import type { Entry } from './types'

/** Seats, clockwise: Jaz, Kira, Tom, Priya, Sam, Wren. Jaz is the speaker. */

function voters(t: Table): [string, string][] {
  const view = t.view().view
  return view.phase === 'agenda'
    ? view.voters.map((v) => [v.playerId, v.state])
    : []
}

const total = (entries: Entry[]) =>
  entries.reduce((sum, e) => sum + e.durationMs, 0)

describe('the clocks of a seat move', () => {
  it('moves the pick clock to a new picker, and charges each moment once', () => {
    const t = table()
    t.wait(10 * SEC)
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 }) // Kira picks next
    t.wait(5 * SEC)
    t.act({ kind: 'seatMoved', playerId: 'kira', toId: 'tom' })
    t.wait(7 * SEC)
    const view = t.view()
    expect(view.view).toMatchObject({ pickerId: 'tom' })
    expect(view.entries).toMatchObject([
      { kind: 'pick', playerId: 'jaz', durationMs: 10 * SEC, running: false },
      { kind: 'pick', playerId: 'kira', durationMs: 5 * SEC, running: false },
      { kind: 'pick', playerId: 'tom', durationMs: 7 * SEC, running: true },
    ])
    expect(total(view.entries)).toBe(22 * SEC)
    expect(view.gameMs).toBe(22 * SEC)
  })

  it('keeps the pick clock running when the picker stays', () => {
    const t = table()
    t.wait(10 * SEC)
    t.act({ kind: 'seatMoved', playerId: 'priya', toId: 'wren' })
    t.wait(5 * SEC)
    expect(t.view().entries).toMatchObject([
      { kind: 'pick', playerId: 'jaz', durationMs: 15 * SEC, running: true },
    ])
  })

  it('moves the vote clock to a new voter, and keeps the earlier votes', () => {
    const t = table()
    playStrategy(t)
    passAll(t)
    t.act({ kind: 'custodiansSet', removed: true })
    t.act({ kind: 'phaseStepped' }) // the agenda phase
    t.act({ kind: 'votingOpened' }) // Kira votes first
    t.wait(5 * SEC)
    t.act({ kind: 'voteCast' }) // Tom votes now
    t.wait(3 * SEC)
    // Tom moves to Wren's seat, so Priya, Sam, and Wren shift back by one.
    t.act({ kind: 'seatMoved', playerId: 'tom', toId: 'wren' })
    t.wait(4 * SEC)
    expect(voters(t)).toEqual([
      ['kira', 'done'],
      ['priya', 'now'],
      ['sam', 'waiting'],
      ['wren', 'waiting'],
      ['tom', 'waiting'],
      ['jaz', 'waiting'],
    ])
    expect(t.view().entries.filter((e) => e.kind === 'vote')).toMatchObject([
      { playerId: 'kira', durationMs: 5 * SEC, running: false },
      { playerId: 'tom', durationMs: 3 * SEC, running: false },
      { playerId: 'priya', durationMs: 4 * SEC, running: true },
    ])
  })

  it('keeps the turn clock running in the action phase', () => {
    const t = table()
    playStrategy(t)
    t.wait(10 * SEC)
    t.act({ kind: 'seatMoved', playerId: 'tom', toId: 'kira' })
    t.wait(5 * SEC)
    expect(t.view().timer).toMatchObject({
      kind: 'turn',
      playerId: 'tom',
      elapsedMs: 15 * SEC,
    })
  })

  it('returns the ring and every clock to their values at the move on undo', () => {
    const t = table()
    t.wait(10 * SEC)
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.wait(5 * SEC)
    t.act({ kind: 'seatMoved', playerId: 'kira', toId: 'tom' })
    t.wait(4 * SEC)
    t.undo()
    t.wait(6 * SEC)
    const view = t.view()
    expect(view.players.map((p) => p.id)).toEqual(view.pickOrder)
    expect(view.pickOrder).toEqual([
      'jaz',
      'kira',
      'tom',
      'priya',
      'sam',
      'wren',
    ])
    expect(view.view).toMatchObject({ pickerId: 'kira' })
    expect(view.entries).toMatchObject([
      { kind: 'pick', playerId: 'jaz', durationMs: 10 * SEC, running: false },
      { kind: 'pick', playerId: 'kira', durationMs: 11 * SEC, running: true },
    ])
    expect(view.gameMs).toBe(21 * SEC)
  })
})
