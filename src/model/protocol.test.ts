import { describe, expect, it } from 'vitest'
import {
  parseClientMessage,
  parseCreateRequest,
  parseServerMessage,
  type Command,
} from './protocol'
import { DEFAULT_LIMITS } from './settings'
import { HOST, SETUP } from './test-room'
import { asVersion1 } from './test-shapes'
import { PLAYERS, table } from './test-table'

const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

describe('messages from a device', () => {
  it('reads hello and every command', () => {
    expect(parseClientMessage({ type: 'hello', token: HOST })).toEqual({
      type: 'hello',
      token: HOST,
    })
    const commands: Command[] = [
      { type: 'claim', seat: 'jaz' },
      { type: 'claim', seat: null },
      { type: 'admin', deviceId: 'd2', admin: true },
      { type: 'start' },
      { type: 'act', input: { kind: 'cardPicked', playerId: 'jaz', card: 3 } },
      { type: 'act', input: { kind: 'turnEnded' } },
      { type: 'act', input: { kind: 'strategyCardPlayed', card: 5 } },
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
      { type: 'hello', token: 'short' },
      { type: 'hello' },
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
  it('reads the missing message and rejects a broken state', () => {
    expect(parseServerMessage({ type: 'missing' })).toEqual({
      type: 'missing',
    })
    expect(parseServerMessage({ type: 'state', serverTime: 1 })).toBeNull()
    expect(parseServerMessage({ type: 'pong' })).toBeNull()
  })
})

describe('the request that creates a game', () => {
  it('reads a setup', () => {
    expect(parseCreateRequest(wire({ token: HOST, setup: SETUP }))).toEqual({
      token: HOST,
      setup: SETUP,
    })
  })

  it('reads a game that an older build saved, in the newest shape', () => {
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    const request = { token: HOST, game: asVersion1(t.game) }
    const parsed = parseCreateRequest(wire(request))
    expect(parsed && 'game' in parsed && parsed.game.version).toBe(6)
  })

  it('rejects a setup that cannot start a game', () => {
    const two = { ...SETUP, players: PLAYERS.slice(0, 2), speakerId: 'jaz' }
    const twin = PLAYERS.map((p) => ({ ...p, id: 'jaz' }))
    const broken = [
      { token: HOST, setup: two },
      { token: HOST, setup: { ...SETUP, players: twin } },
      { token: HOST, setup: { ...SETUP, speakerId: 'zed' } },
      { token: HOST, setup: { ...SETUP, enforceLimits: 'yes' } },
      { token: 'short', setup: SETUP },
      { token: HOST, game: { version: 6 } },
      { token: HOST },
    ]
    for (const raw of broken) expect(parseCreateRequest(wire(raw))).toBeNull()
  })
})
