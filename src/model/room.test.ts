import { describe, expect, it } from 'vitest'
import { DEFAULT_LIMITS } from './settings'
import {
  HOST,
  JAZ,
  KIRA,
  LAPTOP,
  SETUP,
  playStrategyOn,
  seatedServer,
  server,
} from './test-room'
import { MIN, SEC, T0 } from './test-table'

/** The room as stored, and the messages, are in `room-storage.test.ts`. */

describe('the room', () => {
  it('waits in the lobby with no clock until an admin starts the game', () => {
    const s = server()
    expect(s.room).toMatchObject({ revision: 0, game: null })
    expect(s.room.members).toEqual([
      { id: 'd1', token: HOST, seat: null, admin: true },
    ])
    s.wait(5 * MIN)
    expect(s.send(HOST, { type: 'start' })).toBeNull()
    expect(s.room.game?.startedAt).toBe(T0 + 5 * MIN)
    expect(s.room.revision).toBe(1)
    s.wait(10 * SEC)
    expect(s.view()?.timer).toMatchObject({
      kind: 'pick',
      playerId: 'jaz',
      elapsedMs: 10 * SEC,
    })
  })

  it('starts the game only once, and only on an admin device', () => {
    const s = server()
    s.send(JAZ, { type: 'claim', seat: 'jaz' })
    expect(s.send(JAZ, { type: 'start' })).toBe('forbidden')
    expect(s.room.game).toBeNull()
    expect(s.send(HOST, { type: 'start' })).toBeNull()
    expect(s.send(HOST, { type: 'start' })).toBe('invalid')
  })

  it('applies the first of two taps on the same state, and drops the second', () => {
    const s = seatedServer()
    s.send(LAPTOP, { type: 'claim', seat: null })
    s.send(HOST, { type: 'admin', deviceId: 'd4', admin: true })
    playStrategyOn(s)
    const seen = s.room.revision
    const endTurn = { type: 'act', input: { kind: 'turnEnded' } } as const
    expect(s.send(HOST, endTurn, seen)).toBeNull()
    expect(s.send(LAPTOP, endTurn, seen)).toBe('stale')
    // Only Tom's turn ended: Wren plays now.
    expect(s.view()?.view).toMatchObject({ phase: 'action', activeId: 'wren' })
  })

  it('lets a seated device tap for its own player only', () => {
    const s = seatedServer()
    expect(s.act(KIRA, { kind: 'cardPicked', playerId: 'kira', card: 5 })).toBe(
      'forbidden',
    )
    expect(
      s.act(JAZ, { kind: 'cardPicked', playerId: 'jaz', card: 3 }),
    ).toBeNull()
    expect(
      s.act(KIRA, { kind: 'cardPicked', playerId: 'kira', card: 5 }),
    ).toBeNull()
    expect(s.act(JAZ, { kind: 'phaseStepped' })).toBe('forbidden')
  })

  it('times every tap at the server clock', () => {
    const s = seatedServer()
    playStrategyOn(s)
    s.wait(42 * SEC)
    s.act(HOST, { kind: 'turnEnded' })
    expect(s.room.game?.actions.at(-1)).toEqual({
      kind: 'turnEnded',
      at: s.now,
    })
    expect(s.view()?.entries.at(-2)).toMatchObject({
      kind: 'turn',
      playerId: 'tom',
      durationMs: 42 * SEC,
    })
  })

  it('reports a tap that the game does not accept', () => {
    const s = seatedServer()
    // Picks remain, so the action phase cannot begin.
    expect(s.act(HOST, { kind: 'phaseStepped' })).toBe('invalid')
    const before = s.room.revision
    expect(s.send(HOST, { type: 'undo' })).toBe('invalid')
    expect(s.send(HOST, { type: 'resume' })).toBe('invalid')
    expect(s.room.revision).toBe(before)
  })

  it('refuses game commands in the lobby', () => {
    const s = server()
    expect(s.act(HOST, { kind: 'phaseStepped' })).toBe('invalid')
    expect(s.send(HOST, { type: 'pause' })).toBe('invalid')
    expect(s.send(HOST, { type: 'undo' })).toBe('invalid')
  })

  it('pauses, times a rule check, and resumes', () => {
    const s = seatedServer()
    playStrategyOn(s)
    s.wait(30 * SEC)
    expect(s.send(HOST, { type: 'pause' })).toBeNull()
    s.wait(MIN)
    s.send(HOST, { type: 'pauseReason', reason: 'ruleCheck' })
    s.wait(2 * MIN)
    expect(s.send(HOST, { type: 'resume' })).toBeNull()
    expect(s.send(JAZ, { type: 'pause' })).toBe('forbidden')
    const view = s.view()
    expect(view?.timer).toMatchObject({ playerId: 'tom', elapsedMs: 30 * SEC })
    expect(view?.reasonTotals).toEqual([
      { reason: 'ruleCheck', ms: 2 * MIN, count: 1 },
    ])
  })

  it('undoes a tap and returns the clock to its value at the tap', () => {
    const s = seatedServer()
    playStrategyOn(s)
    s.wait(151 * SEC)
    s.act(HOST, { kind: 'turnEnded' })
    s.wait(14 * SEC)
    expect(s.send(HOST, { type: 'undo' })).toBeNull()
    expect(s.view()?.timer).toMatchObject({
      playerId: 'tom',
      elapsedMs: 151 * SEC,
    })
    expect(s.send(JAZ, { type: 'undo' })).toBe('forbidden')
  })

  it('changes the limits of the lobby, and of the game from now on', () => {
    const s = server()
    const limits = { ...DEFAULT_LIMITS, turn: { on: true, ms: MIN } }
    const command = { type: 'limits', enforceLimits: true, limits } as const
    expect(s.send(HOST, command)).toBeNull()
    expect(s.room.setup).toEqual({ ...SETUP, enforceLimits: true, limits })
    s.send(HOST, { type: 'start' })
    expect(s.room.game?.limitsLog).toEqual([{ at: T0, enforce: true, limits }])
    s.wait(MIN)
    s.send(HOST, { ...command, enforceLimits: false })
    expect(s.room.game?.limitsLog.at(-1)).toEqual({
      at: T0 + MIN,
      enforce: false,
      limits,
    })
  })
})

describe('the devices of a room', () => {
  it('joins a device as a viewer, which an admin makes an admin', () => {
    const s = server()
    expect(s.send(LAPTOP, { type: 'claim', seat: null })).toBeNull()
    expect(s.room.members[1]).toEqual({
      id: 'd2',
      token: LAPTOP,
      seat: null,
      admin: false,
    })
    expect(s.send(LAPTOP, { type: 'start' })).toBe('forbidden')
    expect(s.send(LAPTOP, { type: 'admin', deviceId: 'd2', admin: true })).toBe(
      'forbidden',
    )
    expect(
      s.send(HOST, { type: 'admin', deviceId: 'd2', admin: true }),
    ).toBeNull()
    expect(s.send(LAPTOP, { type: 'start' })).toBeNull()
  })

  it('never takes admin from the last admin', () => {
    const s = server()
    expect(s.send(HOST, { type: 'admin', deviceId: 'd1', admin: false })).toBe(
      'invalid',
    )
    s.send(JAZ, { type: 'claim', seat: 'jaz' })
    s.send(HOST, { type: 'admin', deviceId: 'd2', admin: true })
    expect(
      s.send(JAZ, { type: 'admin', deviceId: 'd1', admin: false }),
    ).toBeNull()
    expect(s.send(JAZ, { type: 'admin', deviceId: 'd2', admin: false })).toBe(
      'invalid',
    )
  })

  it('moves a seat to the device that takes it', () => {
    const s = seatedServer()
    expect(s.send(LAPTOP, { type: 'claim', seat: 'jaz' })).toBeNull()
    expect(s.room.members.map((m) => [m.id, m.seat])).toEqual([
      ['d1', null],
      ['d2', null],
      ['d3', 'kira'],
      ['d4', 'jaz'],
    ])
    // The new phone acts for Jaz, and the old one no longer does.
    expect(s.act(JAZ, { kind: 'cardPicked', playerId: 'jaz', card: 3 })).toBe(
      'forbidden',
    )
    expect(
      s.act(LAPTOP, { kind: 'cardPicked', playerId: 'jaz', card: 3 }),
    ).toBeNull()
  })

  it('refuses a seat that the game does not have, or that the device holds', () => {
    const s = seatedServer()
    expect(s.send(JAZ, { type: 'claim', seat: 'zed' })).toBe('invalid')
    expect(s.send(JAZ, { type: 'claim', seat: 'jaz' })).toBe('invalid')
    expect(s.send(HOST, { type: 'claim', seat: null })).toBe('invalid')
  })
})

describe('admin recovery in a room', () => {
  const take = { type: 'admin', deviceId: 'd2', admin: true } as const

  it('lets a seated device take admin while every admin device is away', () => {
    const s = seatedServer()
    expect(s.send(JAZ, take)).toBe('forbidden')
    s.leave(HOST)
    expect(s.send(JAZ, take)).toBeNull()
    expect(s.room.members[1]).toMatchObject({ seat: 'jaz', admin: true })
    expect(s.send(JAZ, { type: 'pause' })).toBeNull()
  })

  it('refuses admin to a viewer, and for another device', () => {
    const s = seatedServer()
    s.send(LAPTOP, { type: 'claim', seat: null })
    s.leave(HOST)
    expect(s.send(LAPTOP, { type: 'admin', deviceId: 'd4', admin: true })).toBe(
      'forbidden',
    )
    expect(s.send(JAZ, { type: 'admin', deviceId: 'd3', admin: true })).toBe(
      'forbidden',
    )
  })
})
