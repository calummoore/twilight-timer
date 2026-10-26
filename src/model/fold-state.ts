import { currentPicker, currentVoter, nextActive } from './fold-orders'
import { STATUS_STEPS } from './rules'
import { limitAt } from './settings'
import type {
  Departure,
  Entry,
  EntryKind,
  Game,
  Phase,
  TimerKey,
} from './types'

/** The open timed unit. Times are entry ms. */
export interface Segment {
  kind: EntryKind
  phase: Exclude<Phase, 'ended'>
  playerId: string | null
  limitKey: TimerKey | null
  firstStartMs: number
  startMs: number
  /** Time banked before a suspension, for a turn paused by a reaction window. */
  bankedMs: number
  card: number | null
}

export interface Reaction {
  card: number
  byId: string
  /** The speaker when the window opened. */
  speakerAtStart: string
  startMs: number
  /** The window length when it opened, or null when no limit applies. */
  limitMs: number | null
  extraMs: number
  done: Map<string, number>
  others: string[]
}

export interface AgendaState {
  n: number
  stage: 'discussion' | 'voting' | 'resolving'
  voted: string[]
}

export interface FoldState {
  game: Game
  /**
   * Every player, also those who left, in clockwise order. It starts as the
   * seat order of the game, and seat moves change it.
   */
  ring: string[]
  /** The players still in the game, in ring order. */
  seats: string[]
  /** The players who left the game, oldest first. */
  departures: Departure[]
  round: number
  phase: Phase
  speakerId: string
  /** The holder of the Naalu "0" token this round, or null. */
  naaluTokenHolderId: string | null
  custodiansRemoved: boolean
  /** Player id to their strategy cards this round, in pick order. */
  picks: Map<string, number[]>
  /** The picks of earlier rounds, oldest first. */
  pickHistory: Map<string, number[]>[]
  passed: Set<string>
  /** The strategy cards played this round. */
  cardsPlayed: Set<number>
  turnCounts: Map<string, number>
  activeId: string | null
  reaction: Reaction | null
  suspended: Segment | null
  statusSteps: boolean[]
  agenda: AgendaState | null
  segment: Segment | null
  entries: Entry[]
  endedMs: number | null
  rejected: number[]
}

export function createState(game: Game): FoldState {
  const s: FoldState = {
    game,
    ring: game.players.map((p) => p.id),
    seats: game.players.map((p) => p.id),
    departures: [],
    round: 1,
    phase: 'strategy',
    speakerId: game.firstSpeakerId,
    naaluTokenHolderId: game.naaluTokenOwnerId,
    custodiansRemoved: false,
    picks: new Map(),
    pickHistory: [],
    passed: new Set(),
    cardsPlayed: new Set(),
    turnCounts: new Map(),
    activeId: null,
    reaction: null,
    suspended: null,
    statusSteps: STATUS_STEPS.map(() => false),
    agenda: null,
    segment: null,
    entries: [],
    endedMs: null,
    rejected: [],
  }
  openStrategySegment(s, 0)
  return s
}

export function open(
  s: FoldState,
  kind: EntryKind,
  playerId: string | null,
  limitKey: TimerKey | null,
  ms: number,
): void {
  if (s.phase === 'ended') return
  s.segment = {
    kind,
    phase: s.phase,
    playerId,
    limitKey,
    firstStartMs: ms,
    startMs: ms,
    bankedMs: 0,
    card: null,
  }
}

/** Turns a segment into an entry. `wall` picks the limit in force. */
export function toEntry(
  s: FoldState,
  seg: Segment,
  ms: number,
  wall: number,
  running: boolean,
): Entry {
  const durationMs = seg.bankedMs + Math.max(0, ms - seg.startMs)
  const limitMs = seg.limitKey
    ? limitAt(s.game.limitsLog, seg.limitKey, wall)
    : null
  return {
    kind: seg.kind,
    phase: seg.phase,
    round: s.round,
    agenda: seg.phase === 'agenda' ? (s.agenda?.n ?? null) : null,
    playerId: seg.playerId,
    startMs: seg.firstStartMs,
    durationMs,
    limitMs,
    overtimeMs: limitMs === null ? 0 : Math.max(0, durationMs - limitMs),
    card: seg.card,
    reactions: null,
    running,
  }
}

export function close(s: FoldState, ms: number, wall: number): void {
  if (!s.segment) return
  s.entries.push(toEntry(s, s.segment, ms, wall, false))
  s.segment = null
}

export function reactionEntry(
  s: FoldState,
  r: Reaction,
  ms: number,
  running: boolean,
): Entry {
  const durationMs = Math.max(0, ms - r.startMs)
  const limitMs = r.limitMs === null ? null : r.limitMs + r.extraMs
  return {
    kind: 'reaction',
    phase: 'action',
    round: s.round,
    agenda: null,
    playerId: null,
    startMs: r.startMs,
    durationMs,
    limitMs,
    overtimeMs: limitMs === null ? 0 : Math.max(0, durationMs - limitMs),
    card: r.card,
    reactions: r.others.map((playerId) => ({
      playerId,
      tookMs: r.done.get(playerId) ?? durationMs,
      marked: r.done.has(playerId),
    })),
    running,
  }
}

/**
 * Closes the reaction window and resumes the suspended turn. When no turn is
 * suspended, because the card player left or `endReaction` ended the turn,
 * the next turn starts instead, unless `advance` is false.
 */
export function closeReaction(s: FoldState, ms: number, advance = true): void {
  if (!s.reaction) return
  s.entries.push(reactionEntry(s, s.reaction, ms, false))
  s.reaction = null
  if (s.suspended) s.segment = { ...s.suspended, startMs: ms }
  else if (advance) nextTurn(s, ms)
  s.suspended = null
}

/**
 * A tap closes the reaction window: the last mark, Mark all done, or the
 * removal of the last player it waits for. The strategic action was the
 * action of the turn, so the turn ends where the window began, and the next
 * turn starts at the close. A game from an older build resumes the turn.
 */
export function endReaction(s: FoldState, ms: number, wall: number): void {
  if (s.game.windowEndsTurn) endSuspendedTurn(s, wall)
  closeReaction(s, ms)
}

/** The turn that opened the reaction window ends where the window began. */
export function endSuspendedTurn(s: FoldState, wall: number): void {
  if (!s.suspended) return
  s.entries.push(toEntry(s, s.suspended, s.suspended.startMs, wall, false))
  s.suspended = null
}

/**
 * In a game from an older build, a window with a limit closes itself when
 * the limit passes. Otherwise the window stays open and counts overtime.
 */
export function expireReaction(s: FoldState, ms: number): void {
  const r = s.reaction
  if (!r || r.limitMs === null || s.game.windowEndsTurn) return
  const end = r.startMs + r.limitMs + r.extraMs
  if (ms >= end) closeReaction(s, end)
}

/** The next turn starts, or the status phase when nobody is left to play. */
export function nextTurn(s: FoldState, ms: number): void {
  const next = nextActive(s)
  if (next) {
    startTurn(s, next, ms)
    return
  }
  s.activeId = null
  s.phase = 'status'
  s.statusSteps = STATUS_STEPS.map(() => false)
  open(s, 'status', null, 'statusPhase', ms)
}

/** The pick or vote order re-derives, so the clock follows the new player. */
export function followOrder(s: FoldState, ms: number, wall: number): void {
  const seg = s.segment
  if (s.phase === 'strategy' && seg && seg.playerId !== currentPicker(s)) {
    close(s, ms, wall)
    openStrategySegment(s, ms)
  }
  if (s.agenda?.stage === 'voting' && seg && seg.playerId !== currentVoter(s)) {
    close(s, ms, wall)
    openVoteSegment(s, ms)
  }
}

export function openStrategySegment(s: FoldState, ms: number): void {
  const picker = currentPicker(s)
  if (picker) open(s, 'pick', picker, 'strategyPick', ms)
  else open(s, 'table', null, null, ms)
}

export function openVoteSegment(s: FoldState, ms: number): void {
  if (!s.agenda) return
  const voter = currentVoter(s)
  if (voter) {
    s.agenda.stage = 'voting'
    open(s, 'vote', voter, 'vote', ms)
  } else {
    s.agenda.stage = 'resolving'
    open(s, 'table', null, null, ms)
  }
}

export function startTurn(s: FoldState, id: string, ms: number): void {
  s.activeId = id
  s.turnCounts.set(id, (s.turnCounts.get(id) ?? 0) + 1)
  open(s, 'turn', id, 'turn', ms)
}

export function startAgenda(s: FoldState, n: number, ms: number): void {
  s.phase = 'agenda'
  s.agenda = { n, stage: 'discussion', voted: [] }
  open(s, 'discussion', null, 'agendaDiscussion', ms)
}
