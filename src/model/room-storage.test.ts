import { describe, expect, it } from 'vitest'
import { parseServerMessage } from './protocol'
import { newRoom, parseRoom, roomOfGame, roomState, stateMessage } from './room'
import { DEFAULT_LIMITS } from './settings'
import {
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
      { ...room, version: 2 },
      { ...room, code: '7qk2hn' },
      { ...room, revision: -1 },
      { ...room, revision: 1.5 },
      { ...room, game: { version: 6 } },
      { ...room, members: [{ id: 'd1', seat: null, admin: true }] },
      { ...room, setup: { ...SETUP, speakerId: 'zed' } },
      null,
    ]
    for (const raw of broken) expect(parseRoom(wire(raw))).toBeNull()
  })

  it('makes a room of a saved game, with its setup and its limits', () => {
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
    const text = JSON.stringify(stateMessage(s.room, new Set(), HOST, T0))
    for (const token of [HOST, JAZ, KIRA]) expect(text).not.toContain(token)
  })

  it('names the receiving device, or none before it joins', () => {
    const s = seatedServer()
    const connected = new Set<string>()
    expect(stateMessage(s.room, connected, JAZ, T0)).toMatchObject({
      type: 'state',
      serverTime: T0,
      you: 'd2',
    })
    expect(
      stateMessage(s.room, connected, 'new-token-000000000005', T0),
    ).toMatchObject({ you: null })
    expect(stateMessage(s.room, connected, null, T0)).toMatchObject({
      you: null,
    })
  })

  it('reaches the device as it left the server', () => {
    const s = seatedServer()
    playStrategyOn(s)
    const message = stateMessage(s.room, new Set([JAZ]), JAZ, s.now)
    expect(parseServerMessage(wire(message))).toEqual(message)
    const lobby = stateMessage(newRoom(CODE, SETUP, HOST), new Set(), HOST, T0)
    expect(parseServerMessage(wire(lobby))).toEqual(lobby)
  })
})
