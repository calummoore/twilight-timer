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

/** Narrows stored data to a game, or returns null when it is not valid. */
export function parseGame(raw: unknown): Game | null {
  if (!isFields(raw) || raw.version !== 1) return null
  const players = listOf(raw.players, parsePlayer)
  const actions = listOf(raw.actions, parseAction)
  const pauses = listOf(raw.pauses, parseInterval)
  const voids = listOf(raw.voids, parseInterval)
  const limitsLog = listOf(raw.limitsLog, parseLimitsChange)
  const { startedAt, firstSpeakerId } = raw
  if (!players || !actions || !pauses || !voids || !limitsLog) return null
  if (!isNumber(startedAt) || typeof firstSpeakerId !== 'string') return null
  if (!players.some((p) => p.id === firstSpeakerId)) return null
  return {
    version: 1,
    startedAt,
    players,
    firstSpeakerId,
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

function parsePlayer(raw: unknown): Player | null {
  if (!isFields(raw)) return null
  const { id, name, colour, faction } = raw
  const c: Colour | undefined = COLOURS.find((x) => x === colour)
  if (typeof id !== 'string' || typeof name !== 'string' || !c) return null
  if (typeof faction !== 'string') return null
  return { id, name, colour: c, faction }
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
