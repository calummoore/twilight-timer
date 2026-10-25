import { actionClock, applyAction } from './fold'
import {
  clockName,
  createState,
  currentVoter,
  expireReaction,
  type FoldState,
} from './fold-state'
import { parseGame, parseGameBase } from './parse'
import { isFields, isNumber, listOf } from './parse-util'
import type { Action, Game } from './types'

/** The actions of a version 1 game, kept only to read old saved games. */
type ActionV1 =
  | { kind: 'cardPicked'; at: number; playerId: string; card: number }
  | { kind: 'reactionDone' | 'speakerMoved'; at: number; playerId: string }
  | { kind: 'reactionExtended'; at: number; ms: number }
  | { kind: 'statusStepToggled'; at: number; step: number }
  | { kind: 'custodiansSet'; at: number; removed: boolean }
  | {
      kind:
        | 'phaseStepped'
        | 'turnEnded'
        | 'passed'
        | 'strategyCardPlayed'
        | 'reactionClosed'
        | 'votingOpened'
        | 'voteCast'
        | 'agendaResolved'
        | 'gameEnded'
      at: number
    }

/**
 * Reads a stored game of any known version. Each step moves the game up
 * one version, so an older game passes every later step.
 */
export function readGame(raw: unknown): Game | null {
  if (!isFields(raw)) return null
  switch (raw.version) {
    case 1:
      return upgradeV1(raw)
    case 2:
      return parseGame(raw)
    default:
      return null
  }
}

/**
 * Version 1 to 2: each action gets a tap id and names the clock that ran,
 * and the times stay on the device clock. A replay of the log fills the
 * new fields from the state before each action.
 */
function upgradeV1(raw: Record<string, unknown>): Game | null {
  const base = parseGameBase(raw)
  const old = listOf(raw.actions, parseActionV1)
  if (!base || !old) return null
  const game: Game = { version: 2, timeBase: 'device', ...base, actions: [] }
  const s = createState(game)
  const toMs = actionClock(game)
  const actions = old.map((a, index) => {
    const ms = toMs(a.at)
    expireReaction(s, ms)
    const next = upgradeAction(s, a, `v1-${index}`)
    applyAction(s, next, ms)
    return next
  })
  return { ...game, actions }
}

function upgradeAction(s: FoldState, a: ActionV1, id: string): Action {
  const clock = clockName(s) ?? ''
  const { at } = a
  switch (a.kind) {
    case 'cardPicked':
      return { ...a, id, clock }
    case 'reactionDone':
      return { ...a, kind: a.kind, id, clock }
    case 'speakerMoved':
      return { ...a, kind: a.kind, id }
    case 'turnEnded':
    case 'passed':
    case 'strategyCardPlayed':
      return { kind: a.kind, id, at, clock, playerId: s.activeId ?? '' }
    case 'voteCast':
      return { kind: a.kind, id, at, clock, playerId: currentVoter(s) ?? '' }
    case 'reactionExtended': {
      const r = s.reaction
      const fromMs = r?.limitMs == null ? -1 : r.limitMs + r.extraMs
      return { ...a, id, clock, fromMs }
    }
    case 'statusStepToggled': {
      const done = !(s.statusSteps[a.step] ?? false)
      return { kind: 'statusStepSet', id, at, step: a.step, done }
    }
    case 'custodiansSet':
      return { kind: a.kind, id, at, removed: a.removed }
    case 'gameEnded':
      return { kind: a.kind, id, at }
    case 'phaseStepped':
    case 'reactionClosed':
    case 'votingOpened':
    case 'agendaResolved':
      return { kind: a.kind, id, at, clock }
  }
}

function parseActionV1(raw: unknown): ActionV1 | null {
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
