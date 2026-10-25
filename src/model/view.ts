import type { InitiativeSlot } from './orders'
import type { PauseView, ReasonTotal } from './pauses'
import type { Departure, EntryKind, Entry, Player } from './types'

/** The clock that runs now. `key` stays the same while one entry runs. */
export interface TimerView {
  key: string
  kind: EntryKind
  playerId: string | null
  elapsedMs: number
  limitMs: number | null
}

/** A strategy card that a player holds this round. */
export interface HeldCard {
  card: number
  /** The player took the strategic action of the card this round. */
  played: boolean
}

export interface RailRow {
  playerId: string
  /** The lowest strategy card number, or 0 for the holder of the Naalu token. */
  initiative: number
  /** The strategy cards of the player, lowest first. */
  cards: HeldCard[]
  state: 'active' | 'passed' | 'waiting'
  /** Own-turn time this game, with the running turn. */
  totalMs: number
  /** Turns started this round. */
  turns: number
}

export interface ReactionTile {
  playerId: string
  passed: boolean
  /** The player left the game while the window was open. */
  left: boolean
  /** Time to mark done, or null while the player has not marked done. */
  tookMs: number | null
}

export interface ReactionView {
  card: number
  byId: string
  elapsedMs: number
  /** Window length with extensions, or null when no limit applies. */
  limitMs: number | null
  /** The active player's turn time, stopped while the window is open. */
  turnMs: number
  /**
   * The game rule: true when closing the window ends the card player's turn,
   * false in an older game. The turn of a card player who left has already
   * ended, so the screens also check that the card player is seated.
   */
  endsTurn: boolean
  tiles: ReactionTile[]
  doneCount: number
  /** The new speaker, for Politics only. */
  speakerChoice: SpeakerChoice | null
}

/** Politics hands the speaker token to a player who does not hold it. */
export interface SpeakerChoice {
  /** The speaker when the window opened. */
  fromId: string
  /** Every other player, in seat order. */
  options: string[]
  /** The new speaker, or null until a player takes the token. */
  chosenId: string | null
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
      /** The players who picked, in initiative order. */
      order: InitiativeSlot[]
      /** The Naalu player while they are in the game, or null. */
      naaluTokenOwnerId: string | null
      /** The player who holds the Naalu token this round. */
      naaluTokenHolderId: string | null
    }
  | {
      phase: 'action'
      activeId: string
      turnNumber: number
      rail: RailRow[]
      passedCount: number
      activeInitiative: number
      /** The strategy cards of the active player, lowest first. */
      activeCards: HeldCard[]
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
  /** Every player of the game, in seat order, also those who left. */
  players: Player[]
  /** The players still in the game, in seat order. */
  seated: string[]
  /** The players who left the game, oldest first. */
  departures: Departure[]
  /** The strategy cards that each player picks in a round. */
  cardsEach: number
  speakerId: string
  pickOrder: string[]
  voteOrder: string[]
  custodiansRemoved: boolean
  /**
   * Game time: the time of the entries and of every rule check, also one in
   * an undone range. Other pause time and undone time do not count.
   */
  gameMs: number
  /** The open pause, or null while the game runs. */
  pause: PauseView | null
  /** The time and the count of each pause reason, such as rule checks. */
  reasonTotals: ReasonTotal[]
  canUndo: boolean
  timer: TimerView | null
  /** Closed entries and snapshots of the running ones. */
  entries: Entry[]
  view: PhaseView
}
