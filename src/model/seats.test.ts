import { describe, expect, it } from 'vitest'
import { ringOf } from './ring'
import { parseRoom } from './room-storage'
import { HOST, JAZ, seatedServer } from './test-room'
import { PLAYERS, playStrategy, table } from './test-table'

/** Seats, clockwise: Jaz, Kira, Tom, Priya, Sam, Wren. Jaz is the speaker. */

const ids = (players: readonly { id: string }[]) => players.map((p) => p.id)

describe('a seat swap', () => {
  it('changes the ring, the pick order, and the voting order', () => {
    const t = table()
    expect(
      t.act({ kind: 'seatsSwapped', playerId: 'kira', otherId: 'sam' }),
    ).toBe(true)
    const view = t.view()
    const ring = ['jaz', 'sam', 'tom', 'priya', 'kira', 'wren']
    expect(ids(view.players)).toEqual(ring)
    expect(view.seated).toEqual(ring)
    expect(view.pickOrder).toEqual(ring)
    expect(view.voteOrder).toEqual([
      'sam',
      'tom',
      'priya',
      'kira',
      'wren',
      'jaz',
    ])
    expect(ids(ringOf(t.game))).toEqual(ring)
  })

  it('swaps the same two seats back with a second swap', () => {
    const t = table()
    t.act({ kind: 'seatsSwapped', playerId: 'kira', otherId: 'sam' })
    t.act({ kind: 'seatsSwapped', playerId: 'sam', otherId: 'kira' })
    expect(ids(t.view().players)).toEqual(ids(PLAYERS))
  })

  it('keeps the speaker token with its player', () => {
    const t = table()
    t.act({ kind: 'seatsSwapped', playerId: 'jaz', otherId: 'priya' })
    const view = t.view()
    expect(view.speakerId).toBe('jaz')
    expect(view.pickOrder).toEqual([
      'jaz',
      'sam',
      'wren',
      'priya',
      'kira',
      'tom',
    ])
  })

  it('rejects a player who left, an unknown player, and the same player', () => {
    const t = table()
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    const rejected = [
      { playerId: 'tom', otherId: 'kira' },
      { playerId: 'kira', otherId: 'tom' },
      { playerId: 'kira', otherId: 'zed' },
      { playerId: 'kira', otherId: 'kira' },
    ]
    for (const swap of rejected) {
      expect(t.act({ kind: 'seatsSwapped', ...swap })).toBe(false)
    }
    expect(t.game.actions).toHaveLength(1)
  })

  it('does nothing after the game ends', () => {
    const t = table()
    t.act({ kind: 'gameEnded' })
    const swap = { playerId: 'kira', otherId: 'sam' }
    expect(t.act({ kind: 'seatsSwapped', ...swap })).toBe(false)
  })

  it('keeps the empty seat of a player who left in its place', () => {
    const t = table()
    t.act({ kind: 'playerRemoved', playerId: 'tom' })
    t.act({ kind: 'seatsSwapped', playerId: 'kira', otherId: 'priya' })
    const view = t.view()
    expect(ids(view.players)).toEqual([
      'jaz',
      'priya',
      'tom',
      'kira',
      'sam',
      'wren',
    ])
    expect(view.seated).toEqual(['jaz', 'priya', 'kira', 'sam', 'wren'])
    expect(view.departures).toEqual([{ playerId: 'tom', round: 1 }])
  })

  it('passes the token of a speaker who leaves to their new left neighbour', () => {
    const t = table()
    // Jaz moves to seat 4, so Sam sits on Jaz's left.
    t.act({ kind: 'seatsSwapped', playerId: 'jaz', otherId: 'priya' })
    t.act({ kind: 'playerRemoved', playerId: 'jaz' })
    const view = t.view()
    expect(view.speakerId).toBe('sam')
    expect(view.pickOrder).toEqual(['sam', 'wren', 'priya', 'kira', 'tom'])
  })

  it('keeps the initiative order of the action phase', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'seatsSwapped', playerId: 'tom', otherId: 'wren' })
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
    t.act({ kind: 'seatsSwapped', playerId: 'kira', otherId: 'wren' })
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

describe('a seat swap on the server', () => {
  it('applies for an admin device only, and keeps the setup', () => {
    const s = seatedServer()
    const swap = {
      kind: 'seatsSwapped',
      playerId: 'jaz',
      otherId: 'kira',
    } as const
    expect(s.act(JAZ, swap)).toBe('forbidden')
    expect(s.act(HOST, swap)).toBeNull()
    const ring = ['kira', 'jaz', 'tom', 'priya', 'sam', 'wren']
    expect(s.view()?.players.map((p) => p.id)).toEqual(ring)
    expect(s.room.setup.players).toEqual(PLAYERS)
    // The stored room keeps the swap.
    const stored = parseRoom(JSON.parse(JSON.stringify(s.room)))
    expect(stored).toEqual(s.room)
    expect(stored?.game && ids(ringOf(stored.game))).toEqual(ring)
  })
})
