import { describe, expect, it } from 'vitest'
import { parseServerMessage } from './protocol'
import { newRoom, parseRoom, roomState, stateMessage } from './room'
import {
  CODE,
  HOST,
  JAZ,
  KIRA,
  SETUP,
  playStrategyOn,
  seatedServer,
  tableServer,
} from './test-room'
import { withNullCards } from './test-shapes'
import { MIN, T0, olderTable, playStrategy, table } from './test-table'

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
  })

  it('reads a room whose game keeps the values of an older build', () => {
    // The old window rule, null cards, and rule checks, one still open.
    const t = olderTable()
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed', card: 1 }) // Tom plays Leadership
    t.act({ kind: 'reactionClosed' }) // Tom's turn resumes
    t.pause()
    t.pauseReason('ruleCheck')
    t.wait(MIN)
    t.pauseReason(null)
    t.wait(MIN)
    t.resume()
    t.pause()
    t.pauseReason('ruleCheck')
    const room = { ...tableServer().room, game: withNullCards(t.game) }
    expect(room.game.pauses.flatMap((p) => p.reasons)).toHaveLength(2)
    expect(parseRoom(wire(room))).toEqual(room)
  })

  it('rejects a broken room', () => {
    const room = newRoom(CODE, SETUP, HOST)
    const broken = [
      { ...room, version: 3 },
      { ...room, code: '7qk2hn' },
      { ...room, revision: -1 },
      { ...room, revision: 1.5 },
      { ...room, game: { version: 6 } },
      { ...room, game: { ...table().game, version: 5 } },
      { ...room, members: [{ id: 'd1', seat: null, admin: true }] },
      { ...room, setup: { ...SETUP, speakerId: 'zed' } },
      { ...room, creator: 'short' },
      { ...room, creator: undefined },
      null,
    ]
    for (const raw of broken) expect(parseRoom(wire(raw))).toBeNull()
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

  it('reads a state with no creator flag as a device that did not create the game', () => {
    const room = roomState(seatedServer().room, new Set())
    const older = { type: 'state', serverTime: T0, you: 'd2', room }
    expect(parseServerMessage(wire(older))).toMatchObject({ creator: false })
    const odd = { ...older, creator: 'yes' }
    expect(parseServerMessage(wire(odd))).toMatchObject({ creator: false })
  })
})
