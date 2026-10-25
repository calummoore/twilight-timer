import { parseGame } from './parse'
import { parseActionInput } from './parse-action'
import { isFields, isNumber, listOf, type Fields } from './parse-util'
import type { Answer, Change, Role, SeatPrivate, SeatView, View } from './share'
import { TIMER_KEYS, type TimerLimit } from './types'

/** Narrows a change from a device, or returns null when it is not valid. */
export function parseChange(raw: unknown): Change | null {
  if (!isFields(raw) || typeof raw.tapId !== 'string') return null
  if (!isNumber(raw.at)) return null
  const base = { tapId: raw.tapId, at: raw.at }
  const seat = typeof raw.seat === 'string' ? raw.seat : null
  switch (raw.kind) {
    case 'act': {
      const input = parseActionInput(raw.input)
      return input ? { ...base, kind: raw.kind, input } : null
    }
    case 'undo':
      return typeof raw.actionId === 'string'
        ? { ...base, kind: raw.kind, actionId: raw.actionId }
        : null
    case 'pause':
    case 'resume':
    case 'stopSharing':
      return { ...base, kind: raw.kind }
    case 'limit': {
      const timer = TIMER_KEYS.find((k) => k === raw.timer)
      const limit = parseTimerLimit(raw.limit)
      return timer && limit ? { ...base, kind: raw.kind, timer, limit } : null
    }
    case 'enforce':
      return typeof raw.enforce === 'boolean'
        ? { ...base, kind: raw.kind, enforce: raw.enforce }
        : null
    case 'claimSeat':
    case 'requestMove':
    case 'approveMove':
    case 'releaseSeat':
      return seat ? { ...base, kind: raw.kind, seat } : null
    default:
      return null
  }
}

function parseTimerLimit(raw: unknown): TimerLimit | null {
  if (!isFields(raw) || typeof raw.on !== 'boolean') return null
  return isNumber(raw.ms) && raw.ms > 0 ? { on: raw.on, ms: raw.ms } : null
}

export function parseRole(raw: unknown): Role | null {
  return raw === 'table' || raw === 'player' ? raw : null
}

/** This release keeps the private part empty, so it reads as empty. */
export function parsePrivate(raw: unknown): SeatPrivate | null {
  return isFields(raw) ? {} : null
}

export function parseAnswer(raw: unknown): Answer | null {
  if (!isFields(raw)) return null
  if (raw.ok === true)
    return isNumber(raw.rev) ? { ok: true, rev: raw.rev } : null
  const { reason } = raw
  return raw.ok === false &&
    (reason === 'stale' ||
      reason === 'role' ||
      reason === 'closed' ||
      reason === 'held')
    ? { ok: false, reason }
    : null
}

function parseSeatView(raw: unknown): SeatView | null {
  if (!isFields(raw) || typeof raw.seat !== 'string') return null
  const { held, yours, online, request } = raw
  if (typeof held !== 'boolean' || typeof yours !== 'boolean') return null
  if (typeof online !== 'boolean') return null
  if (request !== 'none' && request !== 'yours' && request !== 'other') {
    return null
  }
  return { seat: raw.seat, held, yours, online, request }
}

export function parseSeatViews(raw: unknown): SeatView[] | null {
  return listOf(raw, parseSeatView)
}

/** Narrows a view from the server, or returns null when it is not valid. */
export function parseView(raw: unknown): View | null {
  if (!isFields(raw)) return null
  const { gameId, code, closed, rev, seat } = raw
  const role = parseRole(raw.role)
  const game = parseGame(raw.game)
  const seats = parseSeatViews(raw.seats)
  if (typeof gameId !== 'string' || typeof code !== 'string') return null
  if (typeof closed !== 'boolean' || !isNumber(rev) || !role) return null
  if (!game || !seats || (seat !== null && typeof seat !== 'string')) {
    return null
  }
  const priv = raw.private === null ? null : parsePrivate(raw.private)
  return { gameId, code, closed, rev, role, seat, game, private: priv, seats }
}

/** Reads JSON text as `unknown` fields, or null when it is not an object. */
export function readFields(text: string): Fields | null {
  try {
    const raw: unknown = JSON.parse(text)
    return isFields(raw) ? raw : null
  } catch {
    return null
  }
}
