import { describe, expect, it } from 'vitest'
import { ringOf } from './ring'
import { parseRoom } from './room-storage'
import { HOST, JAZ, seatedServer } from './test-room'
import { PLAYERS, playStrategy, table } from './test-table'

/** Seats, clockwise: Jaz, Kira, Tom, Priya, Sam, Wren. Jaz is the speaker. */

const ids = (players: readonly { id: string }[]) => players.map((p) => p.id)

describe('a seat move', () => {
  it('changes the ring, the pick order, and the voting order', () => {
    const t = table()
    // Kira moves two seats on, so Tom and Priya shift back into the gap.
    expect(t.act({ kind: 'seatMoved', playerId: 'kira', toId: 'priya' })).toBe(
      true,
    )
    const view = t.view()
    const ring = ['jaz', 'tom', 'priya', 'kira', 'sam', 'wren']
    expect(ids(view.players)).toEqual(ring)
    expect(view.seated).toEqual(ring)
    expect(view.pickOrder).toEqual(ring)
    expect(view.voteOrder).toEqual([
      'tom',
      'priya',
      'kira',
      'sam',
      'wren',
      'jaz',
    ])
    expect(ids(ringOf(t.game))).toEqual(ring)
  })

  it('moves a seat back with a second move the other way round', () => {
    const t = table()
    t.act({ kind: 'seatMoved', playerId: 'kira', toId: 'priya' })
    t.act({ kind: 'seatMoved', playerId: 'kira', toId: 'tom' })
    expect(ids(t.view().players)).toEqual(ids(PLAYERS))
  })

  it('keeps the speaker token with its player', () => {
    const t = table()
    t.act({ kind: 'seatMoved', playerId: 'jaz', toId: 'priya' })
    const view = t.view()
    expect(view.speakerId).toBe('jaz')
    expect(ids(view.players)).toEqual([
      'kira',
      'tom',
      'priya',
      'jaz',
      'sam',
      'wren',
    ])
    expect(view.pickOrder).toEqual([
      'jaz',
      'sam',
      'wren',
      'kira',
      'tom',
      'priya',
    ])
  })

  it('rejects a player who left, an unknown player, and the same player', () => {
    const t = table()
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    const rejected = [
      { playerId: 'tom', toId: 'kira' },
      { playerId: 'kira', toId: 'tom' },
      { playerId: 'kira', toId: 'zed' },
      { playerId: 'kira', toId: 'kira' },
    ]
    for (const move of rejected) {
      expect(t.act({ kind: 'seatMoved', ...move })).toBe(false)
    }
    expect(t.game.actions).toHaveLength(1)
  })

  it('does nothing after the game ends', () => {
    const t = table()
    t.act({ kind: 'gameEnded' })
    const move = { playerId: 'kira', toId: 'sam' }
    expect(t.act({ kind: 'seatMoved', ...move })).toBe(false)
  })

  it('keeps the empty seat of a player who left in its place', () => {
    const t = table()
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    // Priya and Sam shift back past Tom's empty seat, which stays.
    t.act({ kind: 'seatMoved', playerId: 'kira', toId: 'sam' })
    const view = t.view()
    expect(ids(view.players)).toEqual([
      'jaz',
      'priya',
      'tom',
      'sam',
      'kira',
      'wren',
    ])
    expect(view.seated).toEqual(['jaz', 'priya', 'sam', 'kira', 'wren'])
    expect(view.departures).toEqual([{ playerId: 'tom', round: 1 }])
  })

  it('passes the token of a speaker who leaves to their new left neighbour', () => {
    const t = table()
    // Jaz moves to seat 4, so Sam sits on Jaz's left.
    t.act({ kind: 'seatMoved', playerId: 'jaz', toId: 'priya' })
    t.act({ kind: 'playerRemoved', playerId: 'jaz' })
    const view = t.view()
    expect(view.speakerId).toBe('sam')
    expect(view.pickOrder).toEqual(['sam', 'wren', 'kira', 'tom', 'priya'])
  })

  it('keeps the initiative order of the action phase', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'seatMoved', playerId: 'tom', toId: 'wren' })
    const view = t.view().view
    expect(view.phase === 'action' && view.rail.map((r) => r.playerId)).toEqual(
      ['tom', 'wren', 'jaz', 'sam', 'kira', 'priya'],
    )
    expect(view).toMatchObject({ activeId: 'tom' })
  })

  it('keeps the tiles of an open reaction window', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'turnEnded' }) // Tom
    t.act({ kind: 'turnEnded' }) // Wren
    t.act({ kind: 'strategyCardPlayed', card: 3 }) // Jaz plays Politics
    // Kira moves the shorter way round, past Jaz, to Wren's seat.
    t.act({ kind: 'seatMoved', playerId: 'kira', toId: 'wren' })
    const view = t.view().view
    const r = view.phase === 'action' ? view.reaction : null
    expect(r?.tiles.map((tile) => tile.playerId)).toEqual([
      'kira',
      'tom',
      'priya',
      'sam',
      'wren',
    ])
    // The new speaker choice follows the ring.
    expect(r?.speakerChoice?.options).toEqual([
      'wren',
      'tom',
      'priya',
      'sam',
      'kira',
    ])
  })
})

describe('a seat move on the server', () => {
  it('applies for an admin device only, and keeps the setup', () => {
    const s = seatedServer()
    const move = { kind: 'seatMoved', playerId: 'jaz', toId: 'kira' } as const
    expect(s.act(JAZ, move)).toBe('forbidden')
    expect(s.act(HOST, move)).toBeNull()
    const ring = ['kira', 'jaz', 'tom', 'priya', 'sam', 'wren']
    expect(ids(s.view()?.players ?? [])).toEqual(ring)
    expect(s.room.setup.players).toEqual(PLAYERS)
    // The stored room keeps the move.
    const stored = parseRoom(JSON.parse(JSON.stringify(s.room)))
    expect(stored).toEqual(s.room)
    expect(stored?.game && ids(ringOf(stored.game))).toEqual(ring)
  })
})
