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
 * From a device. Hello names the browser and the build of the page, and each
 * command names the revision that the device saw.
 */
export type ClientMessage =
  | { type: 'hello'; token: string; build: string }
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
  /**
   * No admin device has a connection now, so a seated device may take
   * admin. The device that created the game counts as an admin device until
   * it joins.
   */
  adminsAway: boolean
}

/**
 * The messages from the server that end the connection: no game has the
 * code, the server cannot read the game under the code, or the page runs
 * another build than the server.
 */
export const NOTICES = ['missing', 'unreadable', 'outdated'] as const
export type Notice = (typeof NOTICES)[number]

/** From the server: the state, or a notice. Each names the server's build. */
export type ServerMessage = { build: string } & (
  | {
      type: 'state'
      /** The server clock when it sent the state, in ms. */
      serverTime: number
      /** The id of the receiving device, or null before it joins. */
      you: string | null
      /**
       * The receiving device created the game and has not joined it yet, so
       * it joins with admin.
       */
      creator: boolean
      room: RoomState
    }
  | { type: Notice }
)

/** The body of the request that creates a game from a setup. */
export interface CreateRequest {
  token: string
  setup: Setup
}

/**
 * Reads the build that a message names, before the rest of the message. The
 * `build` field keeps its shape in every build, so that a page or a server
 * of another build still reads it. Returns null when it has none.
 */
export function buildOf(raw: unknown): string | null {
  if (!isFields(raw) || typeof raw.build !== 'string') return null
  return raw.build === '' ? null : raw.build
}

export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!isFields(raw)) return null
  if (raw.type === 'hello') {
    const token = parseToken(raw.token)
    const build = buildOf(raw)
    if (token === null || build === null) return null
    return { type: 'hello', token, build }
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
  const build = buildOf(raw)
  if (!isFields(raw) || build === null) return null
  const notice = NOTICES.find((n) => n === raw.type)
  if (notice) return { build, type: notice }
  const { serverTime, you } = raw
  if (raw.type !== 'state' || !isNumber(serverTime)) return null
  if (you !== null && typeof you !== 'string') return null
  // A state without the flag reads as a device that did not create the game.
  const creator = raw.creator === true
  const room = parseRoomState(raw.room)
  return room && { build, type: 'state', serverTime, you, creator, room }
}

function parseRoomState(raw: unknown): RoomState | null {
  if (!isFields(raw)) return null
  const code = typeof raw.code === 'string' ? parseCode(raw.code) : null
  const setup = parseSetup(raw.setup)
  const game = raw.game === null ? null : parseGame(raw.game)
  const devices = listOf(raw.devices, parseDeviceView)
  if (!code || !isRevision(raw.revision) || !setup || !devices) return null
  if (game === null && raw.game !== null) return null
  // A state without the flag reads as one with an admin device connected.
  const adminsAway = raw.adminsAway === true
  return { code, revision: raw.revision, setup, game, devices, adminsAway }
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
  const setup = parseSetup(raw.setup)
  return token !== null && setup ? { token, setup } : null
}

/** A revision is a count of changes, so it is a whole number from 0. */
function isRevision(raw: unknown): raw is number {
  return Number.isSafeInteger(raw) && typeof raw === 'number' && raw >= 0
}
