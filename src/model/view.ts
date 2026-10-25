import type { EntryKind, Entry, Player } from './types'

/** The clock that runs now. `key` stays the same while one entry runs. */
export interface TimerView {
  key: string
  kind: EntryKind
  playerId: string | null
  elapsedMs: number
  limitMs: number | null
}

export interface RailRow {
  playerId: string
  card: number
  state: 'active' | 'passed' | 'waiting'
  cardPlayed: boolean
  /** Own-turn time this game, with the running turn. */
  totalMs: number
  /** Turns started this round. */
  turns: number
}

export interface ReactionTile {
  playerId: string
  passed: boolean
  /** Time to mark done, or null while the player has not marked done. */
  tookMs: number | null
}

export interface ReactionView {
  card: number
  byId: string
  elapsedMs: number
  /** Window length with extensions, or null when no limit applies. */
  limitMs: number | null
  /** The active player's turn time, paused while the window is open. */
  pausedTurnMs: number
  tiles: ReactionTile[]
  doneCount: number
}

export interface VoterRow {
  playerId: string
  state: 'done' | 'now' | 'waiting'
  /** Voting time, or null when the player has not voted yet. */
  durationMs: number | null
}

export type PhaseView =
  | {
      phase: 'strategy'
      pickerId: string | null
      /** Strategy card to the player who took it, this round. */
      owners: Record<number, string>
      /** Trade goods on each card that nobody has picked yet. */
      tradeGoods: Record<number, number>
    }
  | {
      phase: 'action'
      activeId: string
      turnNumber: number
      rail: RailRow[]
      passedCount: number
      activeCard: number
      cardPlayed: boolean
      reaction: ReactionView | null
    }
  | { phase: 'status'; steps: boolean[] }
  | {
      phase: 'agenda'
      agenda: number
      stage: 'discussion' | 'voting' | 'resolving'
      voters: VoterRow[]
      discussionMs: number
      discussionLimitMs: number | null
    }
  | { phase: 'summary' }
  | { phase: 'ended' }

export interface GameView {
  round: number
  players: Player[]
  speakerId: string
  pickOrder: string[]
  voteOrder: string[]
  custodiansRemoved: boolean
  /** Game time: wall time since the start, without pauses and undone time. */
  gameMs: number
  /** The name of the clock that runs now, or null once the game ended. */
  clock: string | null
  paused: boolean
  canUndo: boolean
  timer: TimerView | null
  /** Closed entries and snapshots of the running ones. */
  entries: Entry[]
  view: PhaseView
}
