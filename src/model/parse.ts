import { FACTIONS, isFactionId, type FactionId } from './factions'
import { COLOURS, type Colour } from './rules'
import { ALARM_SOUNDS, DEFAULT_SETTINGS, type Settings } from './settings'
import {
  PAUSE_REASONS,
  TIMER_KEYS,
  type Action,
  type Game,
  type Interval,
  type Limits,
  type LimitsChange,
  type Pause,
  type Player,
  type ReasonRange,
} from './types'

type Fields = Record<string, unknown>

/** The stored versions that this build reads. Older versions load as the newest. */
const VERSIONS: readonly unknown[] = [1, 2, 3, 4, 5]

/**
 * Narrows stored data to a game, or returns null when it is not valid.
 * Version 1, from builds before the Naalu token, loads with no token owner.
 * Version 2, from builds before player removal, has the shape of version 3.
 * Versions 1 to 3, from builds before a window close ended the turn, load
 * with the window rule of those builds, unless they store the rule.
 * Versions 1 to 4, from builds before pause reasons, have no rule checks.
 * The exception is a version 4 game that the pause-reasons branch saved
 * before main took version 4: it keeps its rule checks, and it has the old
 * window rule of its build.
 */
export function parseGame(raw: unknown): Game | null {
  if (!isFields(raw) || !VERSIONS.includes(raw.version)) return null
  const legacy = raw.version === 1
  const players = listOf(raw.players, (p) => parsePlayer(p, legacy))
  const actions = listOf(raw.actions, parseAction)
  const pauses = listOf(raw.pauses, parsePause)
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
  const windowEndsTurn = windowRule(raw.version, raw.windowEndsTurn)
  if (windowEndsTurn === null) return null
  return {
    version: 5,
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
 * A version 5 game must store the window rule. An older game has the old
 * rule, unless it stores the rule: a version 4 game from main, and a game
 * that the window change saved as version 3 before main took that version.
 * A version 4 game from the pause-reasons branch stores no rule, so it has
 * the old rule of its build.
 */
function windowRule(version: unknown, stored: unknown): boolean | null {
  if (typeof stored === 'boolean') return stored
  return version === 5 ? null : false
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
    case 'playerRemoved':
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

/**
 * A pause and its reason ranges. A pause from before version 5 has no
 * ranges, except in a version 4 game from the pause-reasons branch. A range
 * that cannot be read is dropped, so its time counts as a plain pause and
 * the game still loads.
 */
function parsePause(raw: unknown): Pause | null {
  const range = parseInterval(raw)
  if (!range || !isFields(raw)) return null
  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons.flatMap((r: unknown) => parseReasonRange(r) ?? [])
    : []
  return { ...range, reasons }
}

function parseReasonRange(raw: unknown): ReasonRange | null {
  const range = parseInterval(raw)
  const reason = isFields(raw)
    ? PAUSE_REASONS.find((r) => r === raw.reason)
    : undefined
  return range && reason ? { reason, ...range } : null
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
