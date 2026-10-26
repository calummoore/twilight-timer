import { describe, expect, it } from 'vitest'
import { parseServerMessage } from './protocol'
import { newRoom, roomOfGame, roomState, stateMessage } from './room'
import { parseRoom, readRoom } from './room-storage'
import { DEFAULT_LIMITS } from './settings'
import {
  BUILD,
  CODE,
  HOST,
  JAZ,
  KIRA,
  SETUP,
  playStrategyOn,
  seatedServer,
} from './test-room'
import { asVersion5 } from './test-shapes'
import { MIN, T0, table } from './test-table'

/** A round trip through JSON, as storage and the socket give it. */
const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

describe('the stored room', () => {
  it('reads a room as it was stored, in the lobby and in the game', () => {
    const lobby = newRoom(CODE, SETUP, HOST)
    expect(parseRoom(wire(lobby))).toEqual(lobby)
    const s = seatedServer()
    playStrategyOn(s)
    s.send(HOST, { type: 'pause' })
    expect(parseRoom(wire(s.room))).toEqual(s.room)
  })

  it('reads a stored value as no room, a room, or a room it cannot read', () => {
    const room = newRoom(CODE, SETUP, HOST)
    expect(readRoom(undefined)).toEqual({ status: 'none' })
    expect(readRoom(wire(room))).toEqual({ status: 'ok', room })
    // A newer build stored it, or a step of the chain is wrong: the server
    // keeps it, so it is not missing.
    for (const raw of [{ ...room, version: 3 }, { version: 2 }, null, 'room']) {
      expect(readRoom(raw)).toEqual({ status: 'unreadable' })
    }
  })

  it('reads a room of version 1, whose creator joined at once', () => {
    const v1 = {
      version: 1,
      code: CODE,
      revision: 3,
      setup: SETUP,
      game: null,
      members: [{ id: 'd1', token: HOST, seat: null, admin: true }],
    }
    expect(parseRoom(wire(v1))).toEqual({ ...v1, version: 2, creator: null })
    // The step sets the creator, whatever a broken room of version 1 holds.
    const odd = { ...v1, creator: 'short' }
    expect(parseRoom(wire(odd))).toEqual({ ...v1, version: 2, creator: null })
  })

  it('reads a room whose game an older build saved', () => {
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    const room = roomOfGame(CODE, t.game, HOST)
    const stored = { ...room, game: asVersion5(t.game) }
    expect(parseRoom(wire(stored))?.game).toEqual(t.game)
  })

  it('rejects a broken room', () => {
    const room = newRoom(CODE, SETUP, HOST)
    const broken = [
      { ...room, version: 3 },
      { ...room, code: '7qk2hn' },
      { ...room, revision: -1 },
      { ...room, revision: 1.5 },
      { ...room, game: { version: 6 } },
      { ...room, members: [{ id: 'd1', seat: null, admin: true }] },
      { ...room, setup: { ...SETUP, speakerId: 'zed' } },
      { ...room, creator: 'short' },
      { ...room, creator: undefined },
      null,
    ]
    for (const raw of broken) expect(parseRoom(wire(raw))).toBeNull()
  })

  it('makes a room of a saved game, which its device joins at once as the table', () => {
    const t = table()
    const limits = { ...DEFAULT_LIMITS, turn: { on: true, ms: MIN } }
    t.setLimits(true, limits)
    const room = roomOfGame(CODE, t.game, HOST)
    expect(room).toMatchObject({ revision: 0, game: t.game })
    expect(room.setup).toEqual({
      players: t.game.players,
      speakerId: 'jaz',
      enforceLimits: true,
      limits,
    })
    expect(room.members).toEqual([
      { id: 'd1', token: HOST, seat: null, admin: true },
    ])
    expect(room.creator).toBeNull()
  })
})

describe('the state that devices get', () => {
  it('shows every device and its connection, but no token', () => {
    const s = seatedServer()
    const state = roomState(s.room, new Set([HOST, KIRA]))
    expect(state.devices).toEqual([
      { id: 'd1', seat: null, admin: true, connected: true },
      { id: 'd2', seat: 'jaz', admin: false, connected: false },
      { id: 'd3', seat: 'kira', admin: false, connected: true },
    ])
    const text = JSON.stringify(
      stateMessage(s.room, new Set(), HOST, T0, BUILD),
    )
    for (const token of [HOST, JAZ, KIRA]) expect(text).not.toContain(token)
  })

  it('sends only the public fields of a device, whatever the server keeps', () => {
    const s = seatedServer()
    const kept = { ...s.room.members[1], secret: 'kept on the server' }
    const room = { ...s.room, members: [s.room.members[0], kept] }
    expect(roomState(room, new Set()).devices[1]).toEqual({
      id: 'd2',
      seat: 'jaz',
      admin: false,
      connected: false,
    })
  })

  it('names the receiving device, or none before it joins', () => {
    const s = seatedServer()
    const connected = new Set<string>()
    expect(stateMessage(s.room, connected, JAZ, T0, BUILD)).toMatchObject({
      type: 'state',
      serverTime: T0,
      you: 'd2',
    })
    expect(
      stateMessage(s.room, connected, 'new-token-000000000005', T0, BUILD),
    ).toMatchObject({ you: null })
    expect(stateMessage(s.room, connected, null, T0, BUILD)).toMatchObject({
      you: null,
    })
  })

  it('reaches the device as it left the server', () => {
    const s = seatedServer()
    playStrategyOn(s)
    const message = stateMessage(s.room, new Set([JAZ]), JAZ, s.now, BUILD)
    expect(parseServerMessage(wire(message))).toEqual(message)
    const lobby = newRoom(CODE, SETUP, HOST)
    const first = stateMessage(lobby, new Set(), HOST, T0, BUILD)
    expect(parseServerMessage(wire(first))).toEqual(first)
    expect(first.build).toBe(BUILD)
  })

  it('reads a state with no creator flag as a device that did not create the game', () => {
    const room = roomState(seatedServer().room, new Set())
    const older = {
      build: BUILD,
      type: 'state',
      serverTime: T0,
      you: 'd2',
      room,
    }
    expect(parseServerMessage(wire(older))).toMatchObject({ creator: false })
    const odd = { ...older, creator: 'yes' }
    expect(parseServerMessage(wire(odd))).toMatchObject({ creator: false })
  })
})
