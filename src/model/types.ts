import type { Colour } from './rules'

export interface Player {
  id: string
  name: string
  colour: Colour
  faction: string
}

export const TIMER_KEYS = [
  'turn',
  'reactionWindow',
  'agendaDiscussion',
  'vote',
  'statusPhase',
  'strategyPick',
] as const
export type TimerKey = (typeof TIMER_KEYS)[number]

export interface TimerLimit {
  on: boolean
  ms: number
}
export type Limits = Record<TimerKey, TimerLimit>

/** Time-limit settings in force from `at` (wall-clock ms) onwards. */
export interface LimitsChange {
  at: number
  enforce: boolean
  limits: Limits
}

/** A wall-clock range that is charged to nobody: a pause or undone time. */
export interface Interval {
  from: number
  to: number | null
}

/**
 * What a tap at the table means, before it names its target. The screens
 * send intents, and `aim` turns each one into an action input.
 */
export type Intent =
  | { kind: 'cardPicked'; playerId: string; card: number }
  | { kind: 'phaseStepped' }
  | { kind: 'turnEnded' }
  | { kind: 'passed' }
  | { kind: 'strategyCardPlayed' }
  | { kind: 'reactionDone'; playerId: string }
  | { kind: 'reactionExtended'; ms: number }
  | { kind: 'reactionClosed' }
  | { kind: 'statusStepSet'; step: number; done: boolean }
  | { kind: 'custodiansSet'; removed: boolean }
  | { kind: 'votingOpened' }
  | { kind: 'voteCast' }
  | { kind: 'agendaResolved' }
  | { kind: 'speakerMoved'; playerId: string }
  | { kind: 'gameEnded' }

/**
 * A tap with its target. `clock` names the clock that ran when the tap was
 * made, so the tap applies only while that clock still runs. Taps that are
 * the same whenever they apply, such as moving the speaker, need no clock.
 */
export type ActionInput =
  | { kind: 'cardPicked'; clock: string; playerId: string; card: number }
  | { kind: 'phaseStepped'; clock: string }
  | { kind: 'turnEnded'; clock: string; playerId: string }
  | { kind: 'passed'; clock: string; playerId: string }
  | { kind: 'strategyCardPlayed'; clock: string; playerId: string }
  | { kind: 'reactionDone'; clock: string; playerId: string }
  | { kind: 'reactionExtended'; clock: string; ms: number; fromMs: number }
  | { kind: 'reactionClosed'; clock: string }
  | { kind: 'statusStepSet'; step: number; done: boolean }
  | { kind: 'custodiansSet'; removed: boolean }
  | { kind: 'votingOpened'; clock: string }
  | { kind: 'voteCast'; clock: string; playerId: string }
  | { kind: 'agendaResolved'; clock: string }
  | { kind: 'speakerMoved'; playerId: string }
  | { kind: 'gameEnded' }

/** One tap at the table: `id` is the tap id, `at` the wall-clock time in ms. */
export type Action = ActionInput & { id: string; at: number }

/** Device: the times come from this device. Server: from the sync service. */
export type TimeBase = 'device' | 'server'

/**
 * A stored game. State is never stored: it is a fold over `actions`.
 * Undo pops the last action.
 */
export interface Game {
  version: 2
  startedAt: number
  timeBase: TimeBase
  /** Seat order, clockwise. */
  players: Player[]
  firstSpeakerId: string
  actions: Action[]
  pauses: Interval[]
  voids: Interval[]
  limitsLog: LimitsChange[]
}

export type Phase =
  'strategy' | 'action' | 'status' | 'agenda' | 'summary' | 'ended'

export type EntryKind =
  'pick' | 'turn' | 'reaction' | 'status' | 'discussion' | 'vote' | 'table'

export interface ReactionTime {
  playerId: string
  /** Time until the player marked done, or the whole window if they did not. */
  tookMs: number
  marked: boolean
}

/** One timed unit of the game. Times are game time: pauses do not count. */
export interface Entry {
  kind: EntryKind
  phase: Exclude<Phase, 'ended'>
  round: number
  /** The agenda number for agenda-phase entries, else null. */
  agenda: number | null
  /** The player charged, or null for table time. */
  playerId: string | null
  startMs: number
  durationMs: number
  limitMs: number | null
  overtimeMs: number
  /** The strategy card played in a turn, or the card of a reaction window. */
  card: number | null
  reactions: ReactionTime[] | null
  running: boolean
}
