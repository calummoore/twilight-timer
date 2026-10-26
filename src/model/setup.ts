import { isFields, listOf } from './parse-fields'
import { parseLimits, parsePlayer } from './parse-parts'
import { MAX_PLAYERS, MIN_PLAYERS } from './rules'
import { limitsNow, type LimitSettings } from './settings'
import type { Game, Player } from './types'

/**
 * The seats and the time limits from Create game. Start game begins the game
 * from them, so no clock runs before the start.
 */
export interface Setup extends LimitSettings {
  /** Seat order, clockwise. */
  players: Player[]
  speakerId: string
}

/** The setup of a game that already runs, such as an older saved game. */
export function setupOfGame(game: Game): Setup {
  return {
    players: game.players,
    speakerId: game.firstSpeakerId,
    ...limitsNow(game.limitsLog),
  }
}

/**
 * Reads a setup: 3 to 8 players with their own ids, a speaker among them,
 * and the time limits. Returns null when it is not valid.
 */
export function parseSetup(raw: unknown): Setup | null {
  if (!isFields(raw)) return null
  const players = listOf(raw.players, parsePlayer)
  const limits = parseLimits(raw.limits)
  const { speakerId, enforceLimits } = raw
  if (!players || !limits || typeof enforceLimits !== 'boolean') return null
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return null
  const ids = new Set(players.map((p) => p.id))
  if (ids.size !== players.length) return null
  if (typeof speakerId !== 'string' || !ids.has(speakerId)) return null
  return { players, speakerId, enforceLimits, limits }
}
