import { parseCode } from './code'
import { parseToken } from './devices'
import { isFields, isNumber } from './parse-fields'
import type { KeyValueStore } from './storage'
import type { GameSummary } from './summary'
import { PHASES } from './types'

/**
 * What a browser keeps of the games on the server: its token, the game that
 * it has open, and the games that it was in.
 */

const TOKEN_KEY = 'ti4tempo.device.v1'
const GAMES_KEY = 'ti4tempo.games.v1'
/** The recent games that a device keeps, newest first. */
const RECENT_MAX = 20

/** A game that this device was in, as the Home screen lists it. */
export interface RecentGame extends GameSummary {
  code: string
  /** When this device last opened the game, in wall-clock ms. */
  seenAt: number
}

export interface DeviceGames {
  /**
   * The game that the device has open, which is the game of its address, so
   * that a new visit returns to it.
   */
  current: string | null
  /** Newest first. */
  recent: RecentGame[]
}

/** The token of this browser. A browser without one keeps a new one. */
export function loadToken(store: KeyValueStore, make: () => string): string {
  const stored = parseToken(store.getItem(TOKEN_KEY))
  if (stored) return stored
  const token = make()
  store.setItem(TOKEN_KEY, token)
  return token
}

/** Reads the games of this device. A broken entry is dropped alone. */
export function loadGames(store: KeyValueStore): DeviceGames {
  const raw = parseJson(store.getItem(GAMES_KEY))
  if (!isFields(raw)) return { current: null, recent: [] }
  const current =
    typeof raw.current === 'string' ? parseCode(raw.current) : null
  const recent = Array.isArray(raw.recent)
    ? raw.recent.flatMap((item: unknown) => parseRecent(item) ?? [])
    : []
  return { current, recent }
}

export function saveGames(store: KeyValueStore, games: DeviceGames): void {
  store.setItem(GAMES_KEY, JSON.stringify(games))
}

/** The device saw a game: it moves to the top of the recent games. */
export function seeGame(recent: RecentGame[], game: RecentGame): RecentGame[] {
  const others = recent.filter((g) => g.code !== game.code)
  return [game, ...others].slice(0, RECENT_MAX)
}

/** The device leaves a game: it forgets the game. */
export function leaveGame(recent: RecentGame[], code: string): RecentGame[] {
  return recent.filter((g) => g.code !== code)
}

function parseRecent(raw: unknown): RecentGame | null {
  if (!isFields(raw) || typeof raw.code !== 'string') return null
  const code = parseCode(raw.code)
  const phase =
    raw.phase === 'lobby' ? 'lobby' : PHASES.find((p) => p === raw.phase)
  const { players, round, seenAt } = raw
  if (!code || !phase || !isNumber(players) || !isNumber(round)) return null
  return isNumber(seenAt) ? { code, players, round, phase, seenAt } : null
}

function parseJson(text: string | null): unknown {
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
