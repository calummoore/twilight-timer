import type { Action } from './types'
import { isFields, isNumber } from './parse-util'

/** Narrows one stored action, or returns null when it is not valid. */
export function parseAction(raw: unknown): Action | null {
  if (!isFields(raw) || !isNumber(raw.at) || typeof raw.id !== 'string') {
    return null
  }
  const { id, at, clock, playerId, card, ms, fromMs, step, done, removed } = raw
  const c = typeof clock === 'string' ? clock : null
  const p = typeof playerId === 'string' ? playerId : null
  switch (raw.kind) {
    case 'cardPicked':
      return c && p && isNumber(card)
        ? { kind: raw.kind, id, at, clock: c, playerId: p, card }
        : null
    case 'turnEnded':
    case 'passed':
    case 'strategyCardPlayed':
    case 'reactionDone':
    case 'voteCast':
      return c && p ? { kind: raw.kind, id, at, clock: c, playerId: p } : null
    case 'phaseStepped':
    case 'reactionClosed':
    case 'votingOpened':
    case 'agendaResolved':
      return c ? { kind: raw.kind, id, at, clock: c } : null
    case 'reactionExtended':
      return c && isNumber(ms) && isNumber(fromMs)
        ? { kind: raw.kind, id, at, clock: c, ms, fromMs }
        : null
    case 'statusStepSet':
      return isNumber(step) && typeof done === 'boolean'
        ? { kind: raw.kind, id, at, step, done }
        : null
    case 'custodiansSet':
      return typeof removed === 'boolean'
        ? { kind: raw.kind, id, at, removed }
        : null
    case 'speakerMoved':
      return p ? { kind: raw.kind, id, at, playerId: p } : null
    case 'gameEnded':
      return { kind: raw.kind, id, at }
    default:
      return null
  }
}
