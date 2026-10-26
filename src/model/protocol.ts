import { parseCode } from './code'
import { parseDevice, parseToken, type Device } from './devices'
import { parseGame } from './parse'
import { isFields, isNumber, listOf } from './parse-fields'
import { parseActionInput, parseLimits } from './parse-parts'
import { parseSetup, type Setup } from './setup'
import {
  PAUSE_REASONS,
  type ActionInput,
  type Game,
  type Limits,
  type PauseReason,
} from './types'

/** The messages between a device and the game on the server. */

/** A change that a device asks the game for. */
export type Command =
  /** Takes a seat, or joins as a table device with a null seat. */
  | { type: 'claim'; seat: string | null }
  | { type: 'admin'; deviceId: string; admin: boolean }
  | { type: 'start' }
  | { type: 'act'; input: ActionInput }
  | { type: 'undo' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'pauseReason'; reason: PauseReason | null }
  | { type: 'limits'; enforceLimits: boolean; limits: Limits }

/**
 * From a device. Hello names the browser, and each command names the
 * revision that the device saw.
 */
export type ClientMessage =
  | { type: 'hello'; token: string }
  | { type: 'command'; rev: number; command: Command }

/** A device of the game, and whether it is connected now. */
export interface DeviceView extends Device {
  connected: boolean
}

/** The game as every device sees it. */
export interface RoomState {
  code: string
  revision: number
  setup: Setup
  /** The game from Start game on, or null in the lobby. */
  game: Game | null
  devices: DeviceView[]
}

/** From the server: the state, or that no game has the code. */
export type ServerMessage =
  | {
      type: 'state'
      /** The server clock when it sent the state, in ms. */
      serverTime: number
      /** The id of the receiving device, or null before it joins. */
      you: string | null
      room: RoomState
    }
  | { type: 'missing' }

/** The body of the request that creates a game, from a setup or a saved game. */
export type CreateRequest =
  { token: string; setup: Setup } | { token: string; game: Game }

export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!isFields(raw)) return null
  if (raw.type === 'hello') {
    const token = parseToken(raw.token)
    return token === null ? null : { type: 'hello', token }
  }
  if (raw.type !== 'command' || !isRevision(raw.rev)) return null
  const command = parseCommand(raw.command)
  return command && { type: 'command', rev: raw.rev, command }
}

function parseCommand(raw: unknown): Command | null {
  if (!isFields(raw)) return null
  switch (raw.type) {
    case 'claim':
      return raw.seat === null || typeof raw.seat === 'string'
        ? { type: raw.type, seat: raw.seat }
        : null
    case 'admin':
      return typeof raw.deviceId === 'string' && typeof raw.admin === 'boolean'
        ? { type: raw.type, deviceId: raw.deviceId, admin: raw.admin }
        : null
    case 'act': {
      const input = parseActionInput(raw.input)
      return input && { type: raw.type, input }
    }
    case 'pauseReason': {
      const reason = PAUSE_REASONS.find((r) => r === raw.reason) ?? null
      return reason !== null || raw.reason === null
        ? { type: raw.type, reason }
        : null
    }
    case 'limits': {
      const limits = parseLimits(raw.limits)
      const { enforceLimits } = raw
      return limits && typeof enforceLimits === 'boolean'
        ? { type: raw.type, enforceLimits, limits }
        : null
    }
    case 'start':
    case 'undo':
    case 'pause':
    case 'resume':
      return { type: raw.type }
    default:
      return null
  }
}

export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (!isFields(raw)) return null
  if (raw.type === 'missing') return { type: 'missing' }
  const { serverTime, you } = raw
  if (raw.type !== 'state' || !isNumber(serverTime)) return null
  if (you !== null && typeof you !== 'string') return null
  const room = parseRoomState(raw.room)
  return room && { type: 'state', serverTime, you, room }
}

function parseRoomState(raw: unknown): RoomState | null {
  if (!isFields(raw)) return null
  const code = typeof raw.code === 'string' ? parseCode(raw.code) : null
  const setup = parseSetup(raw.setup)
  const game = raw.game === null ? null : parseGame(raw.game)
  const devices = listOf(raw.devices, parseDeviceView)
  if (!code || !isRevision(raw.revision) || !setup || !devices) return null
  if (game === null && raw.game !== null) return null
  return { code, revision: raw.revision, setup, game, devices }
}

function parseDeviceView(raw: unknown): DeviceView | null {
  const device = parseDevice(raw)
  if (!device || !isFields(raw) || typeof raw.connected !== 'boolean') {
    return null
  }
  return { ...device, connected: raw.connected }
}

export function parseCreateRequest(raw: unknown): CreateRequest | null {
  if (!isFields(raw)) return null
  const token = parseToken(raw.token)
  if (!token) return null
  if (raw.game !== undefined) {
    const game = parseGame(raw.game)
    return game && { token, game }
  }
  const setup = parseSetup(raw.setup)
  return setup && { token, setup }
}

/** A revision is a count of changes, so it is a whole number from 0. */
function isRevision(raw: unknown): raw is number {
  return Number.isSafeInteger(raw) && typeof raw === 'number' && raw >= 0
}
