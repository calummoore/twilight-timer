import { parseCode } from './code'
import { parseMember, parseToken } from './devices'
import { parseGame } from './parse'
import { isFields, listOf, type Fields } from './parse-fields'
import type { Room } from './room'
import { parseSetup } from './setup'

/**
 * The room as the server stores it: one value under its join code, with its
 * own version. The room parser upgrades the room, then hands the game inside
 * to the game parser, which reads the versions of the game.
 */

/** The value under a code: no room, a room, or one that cannot be read. */
export type StoredRoom =
  { status: 'none' } | { status: 'ok'; room: Room } | { status: 'unreadable' }

/**
 * Reads the value that the server stores under a code, which is undefined
 * when it stores none. A value that the parser rejects is unreadable, not
 * missing, so the server keeps it and never stores another room in its
 * place.
 */
export function readRoom(raw: unknown): StoredRoom {
  if (raw === undefined) return { status: 'none' }
  const room = parseRoom(raw)
  return room ? { status: 'ok', room } : { status: 'unreadable' }
}

/**
 * Reads a stored room of any version, in the shape of the newest. Returns
 * null when it is not valid.
 */
export function parseRoom(raw: unknown): Room | null {
  const room = isFields(raw) ? upgrade(raw) : null
  if (room?.version !== 2) return null
  const code = typeof room.code === 'string' ? parseCode(room.code) : null
  const setup = parseSetup(room.setup)
  const game = room.game === null ? null : parseGame(room.game)
  const members = listOf(room.members, parseMember)
  const creator = room.creator === null ? null : parseToken(room.creator)
  const { revision } = room
  if (!code || code !== room.code || !setup || !members) return null
  if (creator === null && room.creator !== null) return null
  if (!Number.isSafeInteger(revision) || typeof revision !== 'number') {
    return null
  }
  if (revision < 0 || (game === null && room.game !== null)) return null
  return { version: 2, code, revision, setup, game, members, creator }
}

/**
 * Gives a stored room of an older version the shape of the next version,
 * until it has the shape of the newest. Another version stays as it is, so
 * the parser rejects it.
 */
function upgrade(raw: Fields): Fields {
  switch (raw.version) {
    case 1:
      // The device that created a room of version 1 joined it at once.
      return upgrade({ ...raw, version: 2, creator: null })
    default:
      return raw
  }
}
