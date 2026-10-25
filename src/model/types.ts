import type { FactionId } from './factions'
import type { Colour } from './rules'

export interface Player {
  id: string
  name: string
  colour: Colour
  /**
   * The faction from the official list. Only a game from an older build
   * holds null, because those builds allowed a missing or unlisted faction.
   */
  factionId: FactionId | null
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

/** One tap at the table. `at` is the wall-clock time in ms. */
export type Action =
  | { kind: 'cardPicked'; at: number; playerId: string; card: number }
  | { kind: 'phaseStepped'; at: number }
  | { kind: 'turnEnded'; at: number }
  | { kind: 'passed'; at: number }
  | { kind: 'strategyCardPlayed'; at: number }
  | { kind: 'reactionDone'; at: number; playerId: string }
  | { kind: 'reactionExtended'; at: number; ms: number }
  | { kind: 'reactionClosed'; at: number }
  | { kind: 'statusStepToggled'; at: number; step: number }
  | { kind: 'custodiansSet'; at: number; removed: boolean }
  | { kind: 'votingOpened'; at: number }
  | { kind: 'voteCast'; at: number }
  | { kind: 'agendaResolved'; at: number }
  | { kind: 'speakerMoved'; at: number; playerId: string }
  | { kind: 'naaluTokenMoved'; at: number; playerId: string }
  | { kind: 'playerRemoved'; at: number; playerId: string }
  | { kind: 'gameEnded'; at: number }

/** An action before it gets its timestamp. */
export type ActionInput = Action extends infer A
  ? A extends Action
    ? Omit<A, 'at'>
    : never
  : never

/**
 * A stored game. State is never stored: it is a fold over `actions`.
 * Undo pops the last action.
 */
export interface Game {
  version: 3
  startedAt: number
  /** Seat order, clockwise. */
  players: Player[]
  firstSpeakerId: string
  /**
   * The Naalu player, who gets the Naalu "0" token back each round while
   * they are in the game, or null. A version 1 game, from a build before
   * the Naalu token, has null, because its log follows card order.
   */
  naaluTokenOwnerId: string | null
  actions: Action[]
  pauses: Interval[]
  voids: Interval[]
  limitsLog: LimitsChange[]
}

export type Phase =
  'strategy' | 'action' | 'status' | 'agenda' | 'summary' | 'ended'

export type EntryKind =
  'pick' | 'turn' | 'reaction' | 'status' | 'discussion' | 'vote' | 'table'

/** A player who left the game, and the round in which they left. */
export interface Departure {
  playerId: string
  round: number
}

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
