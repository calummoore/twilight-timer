import { isFactionId } from './factions'
import { isFields, isNumber } from './parse-fields'
import { COLOURS, type Colour } from './rules'
import {
  PAUSE_REASONS,
  TIMER_KEYS,
  type Action,
  type ActionInput,
  type Interval,
  type Limits,
  type LimitsChange,
  type Pause,
  type Player,
  type ReasonRange,
} from './types'

/** Parsers for the parts of a game: players, actions, pauses, and limits. */

export function parsePlayer(raw: unknown): Player | null {
  if (!isFields(raw)) return null
  const { id, name, colour, factionId } = raw
  const c: Colour | undefined = COLOURS.find((x) => x === colour)
  if (typeof id !== 'string' || typeof name !== 'string' || !c) return null
  if (factionId !== null && !isFactionId(factionId)) return null
  return { id, name, colour: c, factionId }
}

export function parseAction(raw: unknown): Action | null {
  if (!isFields(raw) || !isNumber(raw.at)) return null
  const input = parseActionInput(raw)
  return input && { ...input, at: raw.at }
}

/** An action as a device sends it, before it gets its time. */
export function parseActionInput(raw: unknown): ActionInput | null {
  if (!isFields(raw)) return null
  const { playerId, card, ms, step, removed } = raw
  const id = typeof playerId === 'string' ? playerId : null
  switch (raw.kind) {
    case 'cardPicked':
      return id && isNumber(card)
        ? { kind: raw.kind, playerId: id, card }
        : null
    case 'reactionDone':
    case 'speakerMoved':
    case 'naaluTokenMoved':
    case 'playerRemoved':
      return id ? { kind: raw.kind, playerId: id } : null
    case 'reactionExtended':
      return isNumber(ms) ? { kind: raw.kind, ms } : null
    case 'statusStepToggled':
      return isNumber(step) ? { kind: raw.kind, step } : null
    case 'custodiansSet':
      return typeof removed === 'boolean' ? { kind: raw.kind, removed } : null
    case 'strategyCardPlayed':
      // An upgraded game from an older build has a null card.
      return isNumber(card) || card === null ? { kind: raw.kind, card } : null
    case 'phaseStepped':
    case 'turnEnded':
    case 'passed':
    case 'reactionClosed':
    case 'votingOpened':
    case 'voteCast':
    case 'agendaResolved':
    case 'gameEnded':
      return { kind: raw.kind }
    default:
      return null
  }
}

export function parseInterval(raw: unknown): Interval | null {
  if (!isFields(raw) || !isNumber(raw.from)) return null
  if (raw.to !== null && !isNumber(raw.to)) return null
  return { from: raw.from, to: raw.to }
}

/**
 * A pause and its reason ranges. A pause from before version 6 has no
 * ranges, except in a game that a preview of pause reasons saved as version
 * 4 or 5. A range that cannot be read is dropped, so its time counts as a
 * plain pause and the game still loads.
 */
export function parsePause(raw: unknown): Pause | null {
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

export function parseLimitsChange(raw: unknown): LimitsChange | null {
  if (!isFields(raw) || !isNumber(raw.at)) return null
  const limits = parseLimits(raw.limits)
  if (typeof raw.enforce !== 'boolean' || !limits) return null
  return { at: raw.at, enforce: raw.enforce, limits }
}

export function parseLimits(raw: unknown): Limits | null {
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
