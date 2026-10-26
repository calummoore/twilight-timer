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
 * Reads a stored game of version 6 or later, in the shape of the newest.
 * Returns null when it is not valid.
 */
export function parseGame(raw: unknown): Game | null {
  const game = isFields(raw) ? upgrade(raw) : null
  if (game?.version !== 7) return null
  const players = listOf(game.players, parsePlayer)
  const actions = listOf(game.actions, parseAction)
  const pauses = listOf(game.pauses, parsePause)
  const voids = listOf(game.voids, parseInterval)
  const limitsLog = listOf(game.limitsLog, parseLimitsChange)
  const { startedAt, firstSpeakerId, windowEndsTurn } = game
  if (!players || !actions || !pauses || !voids || !limitsLog) return null
  if (!isNumber(startedAt) || typeof firstSpeakerId !== 'string') return null
  if (typeof windowEndsTurn !== 'boolean') return null
  const isPlayer = (id: unknown) => players.some((p) => p.id === id)
  if (!isPlayer(firstSpeakerId)) return null
  const owner = game.naaluTokenOwnerId
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

/**
 * Gives a stored game of an older version the shape of the next version,
 * until it has the shape of the newest. Another version stays as it is, so
 * the parser rejects it.
 */
function upgrade(raw: Fields): Fields {
  switch (raw.version) {
    case 6:
      // Builds before seat swaps have the shape of version 7.
      return upgrade({ ...raw, version: 7 })
    default:
      return raw
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
