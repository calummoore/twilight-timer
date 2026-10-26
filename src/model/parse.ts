import { EXPANSIONS } from './factions'
import { bool, isFields, isNumber, listOf, type Fields } from './parse-fields'
import {
  parseAction,
  parseInterval,
  parseLimits,
  parseLimitsChange,
  parsePause,
  parsePlayer,
} from './parse-parts'
import {
  ALARM_SOUNDS,
  DEFAULT_SETTINGS,
  type Expansions,
  type Settings,
} from './settings'
import type { Game } from './types'

/**
 * Narrows stored data to a game, or returns null when it is not valid. Every
 * game on the server is of version 6 or 7. A version 6 game comes from a
 * build before seat swaps and has the shape of version 7, so it loads as
 * version 7.
 */
export function parseGame(raw: unknown): Game | null {
  if (!isFields(raw) || (raw.version !== 6 && raw.version !== 7)) return null
  const players = listOf(raw.players, parsePlayer)
  const actions = listOf(raw.actions, parseAction)
  const pauses = listOf(raw.pauses, parsePause)
  const voids = listOf(raw.voids, parseInterval)
  const limitsLog = listOf(raw.limitsLog, parseLimitsChange)
  const { startedAt, firstSpeakerId, windowEndsTurn } = raw
  if (!players || !actions || !pauses || !voids || !limitsLog) return null
  if (!isNumber(startedAt) || typeof firstSpeakerId !== 'string') return null
  if (typeof windowEndsTurn !== 'boolean') return null
  const isPlayer = (id: unknown) => players.some((p) => p.id === id)
  if (!isPlayer(firstSpeakerId)) return null
  const owner = raw.naaluTokenOwnerId
  if (owner !== null && (typeof owner !== 'string' || !isPlayer(owner))) {
    return null
  }
  return {
    version: 7,
    startedAt,
    players,
    firstSpeakerId,
    naaluTokenOwnerId: owner,
    windowEndsTurn,
    actions,
    pauses,
    voids,
    limitsLog,
  }
}

/** Reads stored settings. Missing or broken fields fall back to defaults. */
export function parseSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS
  if (!isFields(raw)) return d
  const sound = ALARM_SOUNDS.find((s) => s === raw.alarmSound)
  return {
    enforceLimits: bool(raw.enforceLimits, d.enforceLimits),
    limits: parseLimits(raw.limits) ?? d.limits,
    alarmOn: bool(raw.alarmOn, d.alarmOn),
    alarmSound: sound ?? d.alarmSound,
    keepAwake: bool(raw.keepAwake, d.keepAwake),
    showCumulative: bool(raw.showCumulative, d.showCumulative),
    expansions: parseExpansions(raw.expansions),
  }
}

/** Each expansion that is missing or broken falls back to its default alone. */
function parseExpansions(raw: unknown): Expansions {
  const fields: Fields = isFields(raw) ? raw : {}
  const out = { ...DEFAULT_SETTINGS.expansions }
  for (const { id } of EXPANSIONS) out[id] = bool(fields[id], out[id])
  return out
}
