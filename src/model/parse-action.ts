import type { Action, ActionInput } from './types'
import { isFields, isNumber } from './parse-util'

/** Narrows one stored action, or returns null when it is not valid. */
export function parseAction(raw: unknown): Action | null {
  if (!isFields(raw) || !isNumber(raw.at) || typeof raw.id !== 'string') {
    return null
  }
  const input = parseActionInput(raw)
  return input ? { ...input, id: raw.id, at: raw.at } : null
}

/** Narrows an action without its tap id and time, or returns null. */
export function parseActionInput(raw: unknown): ActionInput | null {
  if (!isFields(raw)) return null
  const { clock, playerId, card, ms, fromMs, step, done, removed } = raw
  const c = typeof clock === 'string' ? clock : null
  const p = typeof playerId === 'string' ? playerId : null
  switch (raw.kind) {
    case 'cardPicked':
      return c && p && isNumber(card)
        ? { kind: raw.kind, clock: c, playerId: p, card }
        : null
    case 'turnEnded':
    case 'passed':
    case 'strategyCardPlayed':
    case 'reactionDone':
    case 'voteCast':
      return c && p ? { kind: raw.kind, clock: c, playerId: p } : null
    case 'phaseStepped':
    case 'reactionClosed':
    case 'votingOpened':
    case 'agendaResolved':
      return c ? { kind: raw.kind, clock: c } : null
    case 'reactionExtended':
      return c && isNumber(ms) && isNumber(fromMs)
        ? { kind: raw.kind, clock: c, ms, fromMs }
        : null
    case 'statusStepSet':
      return isNumber(step) && typeof done === 'boolean'
        ? { kind: raw.kind, step, done }
        : null
    case 'custodiansSet':
      return typeof removed === 'boolean' ? { kind: raw.kind, removed } : null
    case 'speakerMoved':
      return p ? { kind: raw.kind, playerId: p } : null
    case 'gameEnded':
      return { kind: raw.kind }
    default:
      return null
  }
}
