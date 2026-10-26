import { describe, expect, it } from 'vitest'
import {
  buildOf,
  parseClientMessage,
  parseCreateRequest,
  parseServerMessage,
  type Command,
} from './protocol'
import { DEFAULT_LIMITS } from './settings'
import { BUILD, HOST, SETUP } from './test-room'
import { PLAYERS, table } from './test-table'

const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

describe('messages from a device', () => {
  it('reads hello with the build of the page, and every command', () => {
    const hello = { type: 'hello', token: HOST, build: BUILD }
    expect(parseClientMessage(wire(hello))).toEqual(hello)
    const commands: Command[] = [
      { type: 'claim', seat: 'jaz' },
      { type: 'claim', seat: null },
      { type: 'admin', deviceId: 'd2', admin: true },
      { type: 'start' },
      { type: 'act', input: { kind: 'cardPicked', playerId: 'jaz', card: 3 } },
      { type: 'act', input: { kind: 'turnEnded' } },
      { type: 'act', input: { kind: 'strategyCardPlayed', card: 5 } },
      {
        type: 'act',
        input: { kind: 'seatMoved', playerId: 'kira', toId: 'sam' },
      },
      { type: 'undo' },
      { type: 'pause' },
      { type: 'resume' },
      { type: 'pauseReason', reason: 'ruleCheck' },
      { type: 'pauseReason', reason: null },
      { type: 'limits', enforceLimits: true, limits: DEFAULT_LIMITS },
    ]
    for (const command of commands) {
      const message = { type: 'command', rev: 7, command }
      expect(parseClientMessage(wire(message))).toEqual(message)
    }
  })

  it('rejects a message it cannot read', () => {
    const broken = [
      { type: 'hello', token: 'short', build: BUILD },
      { type: 'hello', build: BUILD },
      // A page from before builds had ids.
      { type: 'hello', token: HOST },
      { type: 'hello', token: HOST, build: '' },
      { type: 'hello', token: HOST, build: 7 },
      { type: 'command', rev: -1, command: { type: 'undo' } },
      { type: 'command', rev: 1.5, command: { type: 'undo' } },
      { type: 'command', command: { type: 'undo' } },
      { type: 'command', rev: 1, command: { type: 'teleport' } },
      { type: 'command', rev: 1, command: { type: 'claim', seat: 4 } },
      { type: 'command', rev: 1, command: { type: 'admin', deviceId: 'd2' } },
      {
        type: 'command',
        rev: 1,
        command: { type: 'act', input: { kind: 'cardPicked', card: 3 } },
      },
      {
        type: 'command',
        rev: 1,
        command: {
          type: 'act',
          input: { kind: 'seatMoved', playerId: 'kira', toId: 4 },
        },
      },
      {
        type: 'command',
        rev: 1,
        command: { type: 'pauseReason', reason: 'lunch' },
      },
      {
        type: 'command',
        rev: 1,
        command: { type: 'limits', enforceLimits: true, limits: {} },
      },
      'hello',
      null,
    ]
    for (const raw of broken) expect(parseClientMessage(raw)).toBeNull()
  })
})

describe('messages from the server', () => {
  it('reads each notice with the build of the server', () => {
    for (const type of ['missing', 'unreadable', 'outdated']) {
      const notice = { build: BUILD, type }
      expect(parseServerMessage(wire(notice))).toEqual(notice)
    }
  })

  it('rejects a broken message, and one without a build', () => {
    const broken = [
      { build: BUILD, type: 'state', serverTime: 1 },
      { build: BUILD, type: 'pong' },
      // A server from before builds had ids.
      { type: 'missing' },
      { build: 7, type: 'missing' },
      'pong',
      null,
    ]
    for (const raw of broken) expect(parseServerMessage(raw)).toBeNull()
  })
})

describe('the build on the wire', () => {
  it('reads the build first, whatever the rest of the message holds', () => {
    expect(buildOf({ build: BUILD })).toBe(BUILD)
    expect(buildOf({ build: BUILD, type: 'state', room: 'new shape' })).toBe(
      BUILD,
    )
    expect(buildOf({ build: BUILD, type: 'hello' })).toBe(BUILD)
  })

  it('reads no build from a message without one', () => {
    for (const raw of [{ type: 'missing' }, { build: '' }, { build: 7 }]) {
      expect(buildOf(raw)).toBeNull()
    }
    for (const raw of ['pong', null, undefined, [BUILD]]) {
      expect(buildOf(raw)).toBeNull()
    }
  })
})

describe('the request that creates a game', () => {
  it('reads a setup', () => {
    expect(parseCreateRequest(wire({ token: HOST, setup: SETUP }))).toEqual({
      token: HOST,
      setup: SETUP,
    })
  })

  it('rejects a setup that cannot start a game', () => {
    const two = { ...SETUP, players: PLAYERS.slice(0, 2), speakerId: 'jaz' }
    const twin = PLAYERS.map((p) => ({ ...p, id: 'jaz' }))
    const empty = PLAYERS.map((p, i) => (i ? p : { ...p, factionId: null }))
    const broken = [
      { token: HOST, setup: two },
      { token: HOST, setup: { ...SETUP, players: twin } },
      { token: HOST, setup: { ...SETUP, players: empty } },
      { token: HOST, setup: { ...SETUP, speakerId: 'zed' } },
      { token: HOST, setup: { ...SETUP, enforceLimits: 'yes' } },
      { token: 'short', setup: SETUP },
      { token: HOST, game: { version: 6 } },
      { token: HOST, game: table().game },
      { token: HOST },
    ]
    for (const raw of broken) expect(parseCreateRequest(wire(raw))).toBeNull()
  })
})
