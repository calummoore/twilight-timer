import { parseGame } from './parse'
import { isNumber } from './parse-util'
import type { Answer, Change, GameChange, SeatView, View } from './share'
import {
  parseAnswer,
  parseChange,
  parseSeatViews,
  parseView,
  readFields,
} from './share-parse'
import { isGameChange } from './record'
import type { Game } from './types'

/** Messages from a device to the game server. */
export type ClientMessage =
  | {
      t: 'hello'
      protocol: number
      deviceId: string
      secret: string
      tableSecret: string | null
    }
  | {
      t: 'share'
      protocol: number
      deviceId: string
      secret: string
      tableSecret: string
      gameId: string
      game: Game
    }
  | { t: 'change'; change: Change }
  | { t: 'ping'; c: number }

/** Why the server refused a connection. */
export type Refusal =
  /** The code holds no game. */
  | 'none'
  /** Sharing chose a code that already holds a game. */
  | 'taken'
  /** The stored game does not parse. */
  | 'broken'
  /** The device id is known, but the secret does not match. */
  | 'denied'

/** Messages from the game server to a device. */
export type ServerMessage =
  | { t: 'view'; view: View; now: number }
  | { t: 'applied'; rev: number; change: GameChange; now: number }
  | { t: 'seats'; seats: SeatView[]; now: number }
  | { t: 'answer'; tapId: string; answer: Answer; now: number }
  | { t: 'pong'; c: number; s: number }
  | { t: 'refused'; reason: Refusal }
  | { t: 'reload'; protocol: number }

const text = (raw: unknown): raw is string => typeof raw === 'string'

export function parseClientMessage(message: string): ClientMessage | null {
  const raw = readFields(message)
  if (!raw) return null
  const { protocol, deviceId, secret, tableSecret, gameId } = raw
  switch (raw.t) {
    case 'hello':
      if (!isNumber(protocol) || !text(deviceId) || !text(secret)) return null
      if (tableSecret !== null && !text(tableSecret)) return null
      return { t: raw.t, protocol, deviceId, secret, tableSecret }
    case 'share': {
      const game = parseGame(raw.game)
      if (!isNumber(protocol) || !text(deviceId) || !text(secret)) return null
      if (!text(tableSecret) || !text(gameId) || !game) return null
      return { t: raw.t, protocol, deviceId, secret, tableSecret, gameId, game }
    }
    case 'change': {
      const change = parseChange(raw.change)
      return change ? { t: raw.t, change } : null
    }
    case 'ping':
      return isNumber(raw.c) ? { t: raw.t, c: raw.c } : null
    default:
      return null
  }
}

export function parseServerMessage(message: string): ServerMessage | null {
  const raw = readFields(message)
  if (!raw) return null
  const { now, rev, reason } = raw
  switch (raw.t) {
    case 'view': {
      const view = parseView(raw.view)
      return view && isNumber(now) ? { t: raw.t, view, now } : null
    }
    case 'applied': {
      const change = parseChange(raw.change)
      if (!change || !isGameChange(change) || !isNumber(rev)) return null
      return isNumber(now) ? { t: raw.t, rev, change, now } : null
    }
    case 'seats': {
      const seats = parseSeatViews(raw.seats)
      return seats && isNumber(now) ? { t: raw.t, seats, now } : null
    }
    case 'answer': {
      const answer = parseAnswer(raw.answer)
      if (!answer || !text(raw.tapId) || !isNumber(now)) return null
      return { t: raw.t, tapId: raw.tapId, answer, now }
    }
    case 'pong':
      return isNumber(raw.c) && isNumber(raw.s)
        ? { t: raw.t, c: raw.c, s: raw.s }
        : null
    case 'refused':
      return reason === 'none' ||
        reason === 'taken' ||
        reason === 'broken' ||
        reason === 'denied'
        ? { t: raw.t, reason }
        : null
    case 'reload':
      return isNumber(raw.protocol)
        ? { t: raw.t, protocol: raw.protocol }
        : null
    default:
      return null
  }
}
