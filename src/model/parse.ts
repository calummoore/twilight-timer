import { FACTIONS, isFactionId, type FactionId } from './factions'
import { COLOURS, type Colour } from './rules'
import { ALARM_SOUNDS, DEFAULT_SETTINGS, type Settings } from './settings'
import {
  TIMER_KEYS,
  type Action,
  type Game,
  type Interval,
  type Limits,
  type LimitsChange,
  type Player,
} from './types'

type Fields = Record<string, unknown>

/**
 * Narrows stored data to a game, or returns null when it is not valid.
 * Version 1, from builds before the Naalu token, loads with no token owner.
 * Versions 1 and 2, from builds before a window close ended the turn, load
 * with the window rule of those builds.
 */
export function parseGame(raw: unknown): Game | null {
  if (!isFields(raw)) return null
  const { version } = raw
  if (version !== 1 && version !== 2 && version !== 3) return null
  const legacy = version === 1
  const players = listOf(raw.players, (p) => parsePlayer(p, legacy))
  const actions = listOf(raw.actions, parseAction)
  const pauses = listOf(raw.pauses, parseInterval)
  const voids = listOf(raw.voids, parseInterval)
  const limitsLog = listOf(raw.limitsLog, parseLimitsChange)
  const { startedAt, firstSpeakerId } = raw
  if (!players || !actions || !pauses || !voids || !limitsLog) return null
  if (!isNumber(startedAt) || typeof firstSpeakerId !== 'string') return null
  const isPlayer = (id: unknown) => players.some((p) => p.id === id)
  if (!isPlayer(firstSpeakerId)) return null
  const owner = legacy ? null : raw.naaluTokenOwnerId
  if (owner !== null && (typeof owner !== 'string' || !isPlayer(owner))) {
    return null
  }
  const windowEndsTurn = version === 3 ? raw.windowEndsTurn : false
  if (typeof windowEndsTurn !== 'boolean') return null
  return {
    version: 3,
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
  }
}

function parsePlayer(raw: unknown, legacy: boolean): Player | null {
  if (!isFields(raw)) return null
  const { id, name, colour, faction, factionId } = raw
  const c: Colour | undefined = COLOURS.find((x) => x === colour)
  if (typeof id !== 'string' || typeof name !== 'string' || !c) return null
  if (legacy) {
    // Version 1 stored the faction as the text that a player typed.
    if (typeof faction !== 'string') return null
    return { id, name, colour: c, factionId: factionFromText(faction) }
  }
  if (factionId !== null && !isFactionId(factionId)) return null
  return { id, name, colour: c, factionId }
}

/** A typed faction name or id from the list, in any letter case, or null. */
function factionFromText(text: string): FactionId | null {
  const key = text.trim().toLowerCase()
  const match = FACTIONS.find(
    (f) => f.id === key || f.name.toLowerCase() === key,
  )
  return match?.id ?? null
}

function parseAction(raw: unknown): Action | null {
  if (!isFields(raw) || !isNumber(raw.at)) return null
  const { at, playerId, card, ms, step, removed } = raw
  const id = typeof playerId === 'string' ? playerId : null
  switch (raw.kind) {
    case 'cardPicked':
      return id && isNumber(card)
        ? { kind: raw.kind, at, playerId: id, card }
        : null
    case 'reactionDone':
    case 'speakerMoved':
    case 'naaluTokenMoved':
      return id ? { kind: raw.kind, at, playerId: id } : null
    case 'reactionExtended':
      return isNumber(ms) ? { kind: raw.kind, at, ms } : null
    case 'statusStepToggled':
      return isNumber(step) ? { kind: raw.kind, at, step } : null
    case 'custodiansSet':
      return typeof removed === 'boolean'
        ? { kind: raw.kind, at, removed }
        : null
    case 'phaseStepped':
    case 'turnEnded':
    case 'passed':
    case 'strategyCardPlayed':
    case 'reactionClosed':
    case 'votingOpened':
    case 'voteCast':
    case 'agendaResolved':
    case 'gameEnded':
      return { kind: raw.kind, at }
    default:
      return null
  }
}

function parseInterval(raw: unknown): Interval | null {
  if (!isFields(raw) || !isNumber(raw.from)) return null
  if (raw.to !== null && !isNumber(raw.to)) return null
  return { from: raw.from, to: raw.to }
}

function parseLimitsChange(raw: unknown): LimitsChange | null {
  if (!isFields(raw) || !isNumber(raw.at)) return null
  const limits = parseLimits(raw.limits)
  if (typeof raw.enforce !== 'boolean' || !limits) return null
  return { at: raw.at, enforce: raw.enforce, limits }
}

function parseLimits(raw: unknown): Limits | null {
  if (!isFields(raw)) return null
  const out: Partial<Limits> = {}
  for (const key of TIMER_KEYS) {
    const limit = raw[key]
    if (!isFields(limit) || typeof limit.on !== 'boolean') return null
    if (!isNumber(limit.ms) || limit.ms <= 0) return null
    out[key] = { on: limit.on, ms: limit.ms }
  }
  return isComplete(out) ? out : null
}

function isComplete(limits: Partial<Limits>): limits is Limits {
  return TIMER_KEYS.every((key) => limits[key] !== undefined)
}

function listOf<T>(
  raw: unknown,
  parse: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(raw)) return null
  const out: T[] = []
  for (const item of raw) {
    const parsed = parse(item)
    if (parsed === null) return null
    out.push(parsed)
  }
  return out
}

function isFields(raw: unknown): raw is Fields {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
}

function isNumber(raw: unknown): raw is number {
  return typeof raw === 'number' && Number.isFinite(raw)
}

function bool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback
}
