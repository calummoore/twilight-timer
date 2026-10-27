import { isFields, listOf } from './parse-fields'
import { parseExpansions, parseLimits, parseSeat } from './parse-parts'
import { MAX_PLAYERS, MIN_PLAYERS } from './rules'
import type { Expansions, LimitSettings } from './settings'
import type { Seat } from './types'

/**
 * The seats, the expansions, and the time limits from Create game. Start
 * game begins the game from them, so no clock runs before the start. A seat
 * can still lack a faction, which its player or an admin device gives it in
 * the lobby.
 */
export interface Setup extends LimitSettings {
  /** Seat order, clockwise. */
  players: Seat[]
  speakerId: string
  /** The expansions in play, whose factions the lobby offers. */
  expansions: Expansions
}

/**
 * Reads a setup: 3 to 8 seats with their own ids, a speaker among them, the
 * expansions, and the time limits. Returns null when it is not valid.
 */
export function parseSetup(raw: unknown): Setup | null {
  if (!isFields(raw)) return null
  const players = listOf(raw.players, parseSeat)
  const limits = parseLimits(raw.limits)
  const expansions = parseExpansions(raw.expansions)
  const { speakerId, enforceLimits } = raw
  if (!players || !limits || !expansions) return null
  if (typeof enforceLimits !== 'boolean') return null
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return null
  const ids = new Set(players.map((p) => p.id))
  if (ids.size !== players.length) return null
  if (typeof speakerId !== 'string' || !ids.has(speakerId)) return null
  return { players, speakerId, expansions, enforceLimits, limits }
}
