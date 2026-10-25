import { applyGameChange } from './game-change'
import { parseGame } from './parse'
import { isFields, isNumber, listOf } from './parse-util'
import { isGameChange } from './record'
import type {
  Answer,
  Change,
  GameChange,
  Rejection,
  Role,
  SeatPrivate,
  SeatView,
  View,
} from './share'
import {
  parseChange,
  parsePrivate,
  parseRole,
  parseSeatViews,
} from './share-parse'
import type { Game } from './types'

/** What one device keeps of the shared game that it takes part in. */
export interface Session {
  code: string
  /** Null until the first view arrives. */
  role: Role | null
  /** The table secret, kept in table mode to show the table link. */
  tableSecret: string | null
  /** True after this device shared the game, until the server answers. */
  sharing: boolean
  gameId: string | null
  rev: number
  /** The game as the server last confirmed it. */
  confirmed: Game | null
  private: SeatPrivate | null
  seat: string | null
  seats: SeatView[]
  /** The table stopped sharing, or another game holds the code now. */
  closed: boolean
  /** Changes that the server has not answered yet, oldest first. */
  pending: Change[]
  /** The server clock minus the device clock, in ms. */
  offset: number
}

/** The device record: its identity and its shared game, if any. */
export interface DeviceRecord {
  version: 1
  deviceId: string
  secret: string
  session: Session | null
}

export function newSession(code: string, offset: number): Session {
  return {
    code,
    role: null,
    tableSecret: null,
    sharing: false,
    gameId: null,
    rev: 0,
    confirmed: null,
    private: null,
    seat: null,
    seats: [],
    closed: false,
    pending: [],
    offset,
  }
}

/** The game to show: the confirmed game with the pending changes on it. */
export function shownGame(s: Session): Game | null {
  if (!s.confirmed) return null
  return s.pending.reduce(
    (game, change) =>
      isGameChange(change) ? applyGameChange(game, change) : game,
    s.confirmed,
  )
}

/** Keeps a change until the server answers it. */
export function queue(s: Session, change: Change): Session {
  return { ...s, pending: [...s.pending, change] }
}

/** Takes a full view. Another game behind the code ends the session. */
export function onView(s: Session, view: View): Session {
  if (s.gameId !== null && view.gameId !== s.gameId) {
    return { ...s, closed: true, pending: [] }
  }
  return {
    ...s,
    role: view.role,
    sharing: false,
    gameId: view.gameId,
    rev: view.rev,
    confirmed: view.game,
    private: view.private,
    seat: view.seat,
    seats: view.seats,
    closed: view.closed,
  }
}

/**
 * Applies a change that the server applied. Returns null when a change
 * is missing in between, so that the device asks for a full view.
 */
export function onApplied(
  s: Session,
  rev: number,
  change: GameChange,
): Session | null {
  if (!s.confirmed || rev !== s.rev + 1) return null
  return {
    ...s,
    rev,
    confirmed: applyGameChange(s.confirmed, change),
    pending: s.pending.filter((p) => p.tapId !== change.tapId),
  }
}

/** Drops an answered change. Returns the reason when the server refused it. */
export function onAnswer(
  s: Session,
  tapId: string,
  answer: Answer,
): { session: Session; refused: Rejection | null } {
  const had = s.pending.some((p) => p.tapId === tapId)
  const pending = s.pending.filter((p) => p.tapId !== tapId)
  const refused = had && !answer.ok ? answer.reason : null
  return { session: { ...s, pending }, refused }
}

export function onSeats(s: Session, seats: SeatView[]): Session {
  return { ...s, seats }
}

/**
 * One clock sample: the device sent at `sent`, the server answered with
 * its time `server`, and the answer came back at `received`.
 */
export function clockSample(
  sent: number,
  server: number,
  received: number,
): { rtt: number; offset: number } {
  const rtt = Math.max(0, received - sent)
  return { rtt, offset: server - (sent + rtt / 2) }
}

/** Reads a stored device record, or returns null when it does not parse. */
export function parseDeviceRecord(raw: unknown): DeviceRecord | null {
  if (!isFields(raw) || raw.version !== 1) return null
  const { deviceId, secret } = raw
  if (typeof deviceId !== 'string' || typeof secret !== 'string') return null
  const session = raw.session === null ? null : parseSession(raw.session)
  if (raw.session !== null && !session) return null
  return { version: 1, deviceId, secret, session }
}

function parseSession(raw: unknown): Session | null {
  if (!isFields(raw)) return null
  const { code, sharing, rev, closed, offset } = raw
  const tableSecret = nullableText(raw.tableSecret)
  const gameId = nullableText(raw.gameId)
  const seat = nullableText(raw.seat)
  const role = raw.role === null ? null : parseRole(raw.role)
  const confirmed = raw.confirmed === null ? null : parseGame(raw.confirmed)
  const priv = raw.private === null ? null : parsePrivate(raw.private)
  const seats = parseSeatViews(raw.seats)
  const pending = listOf(raw.pending, parseChange)
  if (typeof code !== 'string' || typeof sharing !== 'boolean') return null
  if (typeof closed !== 'boolean' || !isNumber(rev) || !isNumber(offset)) {
    return null
  }
  if (tableSecret === undefined || gameId === undefined) return null
  if (seat === undefined || !seats || !pending) return null
  if (raw.role !== null && !role) return null
  if (raw.confirmed !== null && !confirmed) return null
  return {
    code,
    role,
    tableSecret,
    sharing,
    gameId,
    rev,
    confirmed,
    private: priv,
    seat,
    seats,
    closed,
    pending,
    offset,
  }
}

/** A string or null. Undefined means that the value is not valid. */
function nullableText(raw: unknown): string | null | undefined {
  if (raw === null) return null
  return typeof raw === 'string' ? raw : undefined
}
