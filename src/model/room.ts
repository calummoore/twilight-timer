import { parseCode } from './code'
import {
  act,
  pause,
  resume,
  setLimits,
  setPauseReason,
  startGame,
  undo,
} from './commands'
import { derive } from './derive'
import {
  memberOf,
  parseMember,
  parseToken,
  publicDevice,
  setAdmin,
  takeSeat,
  type Member,
} from './devices'
import { parseGame } from './parse'
import { isFields, listOf, type Fields } from './parse-fields'
import type { Command, RoomState, ServerMessage } from './protocol'
import { mayCommand } from './rights'
import { parseSetup, setupOfGame, type Setup } from './setup'
import type { Game } from './types'

/**
 * One game on the server, under its join code: the setup, the game from
 * Start game on, and the devices. The server stores it as one value.
 */
export interface Room {
  version: 2
  code: string
  /** Grows with every change, so that a tap on an older state does nothing. */
  revision: number
  setup: Setup
  /** The game from Start game on, or null in the lobby. */
  game: Game | null
  members: Member[]
  /**
   * The token of the device that created the game, until it joins. It joins
   * with admin, as the first admin of the game.
   */
  creator: string | null
}

/** Why the server did not apply a command. */
export type Rejection =
  /** The device saw an older revision. */
  | 'stale'
  /** The device may not send the command. */
  | 'forbidden'
  /** The command changes nothing in the state that the device saw. */
  | 'invalid'

export type Outcome = { room: Room } | { rejected: Rejection }

/**
 * A new game in the lobby, with no device yet. The device of `token` created
 * it, and joins it on the claim screen, in a seat or at the table, with admin.
 */
export function newRoom(code: string, setup: Setup, token: string): Room {
  return {
    version: 2,
    code,
    revision: 0,
    setup,
    game: null,
    members: [],
    creator: token,
  }
}

/**
 * A game that a device saved before games lived on the server. The device
 * joins it at once, as a table device with admin.
 */
export function roomOfGame(code: string, game: Game, token: string): Room {
  const room = newRoom(code, setupOfGame(game), token)
  const members = takeSeat([], token, null, true)
  return { ...room, game, members, creator: null }
}

/**
 * Applies a command from the device of `token` at server time `now`. The
 * command must name the current revision, the device must have the right,
 * and the command must change the room.
 */
export function applyCommand(
  room: Room,
  token: string,
  rev: number,
  command: Command,
  now: number,
): Outcome {
  if (rev !== room.revision) return { rejected: 'stale' }
  const device = memberOf(room.members, token)
  const view = room.game && derive(room.game, now)
  if (!mayCommand(device, command, view)) return { rejected: 'forbidden' }
  const next = change(room, token, command, now)
  return next
    ? { room: { ...next, revision: room.revision + 1 } }
    : { rejected: 'invalid' }
}

function change(
  room: Room,
  token: string,
  command: Command,
  now: number,
): Room | null {
  const { game } = room
  switch (command.type) {
    case 'claim': {
      const { seat } = command
      if (seat !== null && !room.setup.players.some((p) => p.id === seat)) {
        return null
      }
      const device = memberOf(room.members, token)
      if (device && device.seat === seat) return null
      // The device that created the game joins with admin.
      const creator = token === room.creator
      const members = takeSeat(room.members, token, seat, creator)
      return { ...room, members, creator: creator ? null : room.creator }
    }
    case 'admin': {
      const members = setAdmin(room.members, command.deviceId, command.admin)
      return members && { ...room, members }
    }
    case 'start': {
      if (game) return null
      const { players, speakerId } = room.setup
      return { ...room, game: startGame(players, speakerId, room.setup, now) }
    }
    case 'limits': {
      const { enforceLimits, limits } = command
      if (!game)
        return { ...room, setup: { ...room.setup, enforceLimits, limits } }
      return withGame(room, setLimits(game, enforceLimits, limits, now))
    }
    case 'act':
      return withGame(room, game && act(game, command.input, now))
    case 'undo':
      return withGame(room, game && undo(game, now))
    case 'pause':
      return withGame(room, game && pause(game, now))
    case 'resume':
      return withGame(room, game && resume(game, now))
    case 'pauseReason':
      return withGame(room, game && setPauseReason(game, command.reason, now))
  }
}

/** The room with a changed game, or null when the game did not change. */
function withGame(room: Room, game: Game | null): Room | null {
  return game && game !== room.game ? { ...room, game } : null
}

/**
 * The room as every device sees it. `connected` holds the tokens of the
 * devices that have a connection now.
 */
export function roomState(
  room: Room,
  connected: ReadonlySet<string>,
): RoomState {
  const { code, revision, setup, game } = room
  const devices = room.members.map((member) => ({
    ...publicDevice(member),
    connected: connected.has(member.token),
  }))
  return { code, revision, setup, game, devices }
}

/** The state message for the device of `token`. */
export function stateMessage(
  room: Room,
  connected: ReadonlySet<string>,
  token: string | null,
  serverTime: number,
): ServerMessage {
  const you =
    token === null ? null : (memberOf(room.members, token)?.id ?? null)
  const creator = token !== null && token === room.creator
  const state = roomState(room, connected)
  return { type: 'state', serverTime, you, creator, room: state }
}

/**
 * Reads a stored room of version 1 or 2. The game inside keeps its own
 * version, so a room reads a game of an older version too. Returns null when
 * it is not valid.
 */
export function parseRoom(raw: unknown): Room | null {
  if (!isFields(raw) || (raw.version !== 1 && raw.version !== 2)) return null
  const code = typeof raw.code === 'string' ? parseCode(raw.code) : null
  const setup = parseSetup(raw.setup)
  const game = raw.game === null ? null : parseGame(raw.game)
  const members = listOf(raw.members, parseMember)
  const creator = parseCreator(raw)
  const { revision } = raw
  if (!code || code !== raw.code || !setup || !members) return null
  if (creator === undefined) return null
  if (!Number.isSafeInteger(revision) || typeof revision !== 'number') {
    return null
  }
  if (revision < 0 || (game === null && raw.game !== null)) return null
  return { version: 2, code, revision, setup, game, members, creator }
}

/** The creator of a stored room, or undefined when it is not valid. */
function parseCreator(raw: Fields): string | null | undefined {
  // The creator of a room of version 1 joined when it created the room.
  if (raw.version === 1 || raw.creator === null) return null
  return parseToken(raw.creator) ?? undefined
}
