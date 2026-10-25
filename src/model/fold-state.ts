import {
  initiativeOrder,
  pickOrder,
  voteOrder,
  type InitiativeSlot,
} from './orders'
import { STATUS_STEPS } from './rules'
import { limitAt } from './settings'
import type { Entry, EntryKind, Game, Phase, TimerKey } from './types'

/** The open timed unit. Times are game ms. */
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
  seats: string[]
  round: number
  phase: Phase
  speakerId: string
  /** The holder of the Naalu "0" token this round, or null. */
  naaluTokenHolderId: string | null
  custodiansRemoved: boolean
  /** Player id to strategy card, this round. */
  picks: Map<string, number>
  /** The picks of earlier rounds, oldest first. */
  pickHistory: Map<string, number>[]
  passed: Set<string>
  scPlayed: Set<string>
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
    seats: game.players.map((p) => p.id),
    round: 1,
    phase: 'strategy',
    speakerId: game.firstSpeakerId,
    naaluTokenHolderId: game.naaluTokenOwnerId,
    custodiansRemoved: false,
    picks: new Map(),
    pickHistory: [],
    passed: new Set(),
    scPlayed: new Set(),
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

/** Closes the reaction window and resumes the suspended turn. */
export function closeReaction(s: FoldState, ms: number): void {
  if (!s.reaction) return
  s.entries.push(reactionEntry(s, s.reaction, ms, false))
  s.reaction = null
  if (s.suspended) s.segment = { ...s.suspended, startMs: ms }
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

export function currentPicker(s: FoldState): string | null {
  return pickOrder(s.seats, s.speakerId).find((id) => !s.picks.has(id)) ?? null
}

export function currentVoter(s: FoldState): string | null {
  const voted = s.agenda?.voted ?? []
  return (
    voteOrder(s.seats, s.speakerId).find((id) => !voted.includes(id)) ?? null
  )
}

/** This round's initiative order, with the Naalu "0" token. */
export function turnOrder(s: FoldState): InitiativeSlot[] {
  return initiativeOrder(s.picks, s.naaluTokenHolderId)
}

/** The next player in initiative order who has not passed, or null. */
export function nextActive(s: FoldState): string | null {
  const order = turnOrder(s).map((slot) => slot.playerId)
  const from = s.activeId === null ? -1 : order.indexOf(s.activeId)
  for (let k = 1; k <= order.length; k++) {
    const id = order[(from + k) % order.length]
    if (id !== undefined && !s.passed.has(id)) return id
  }
  return null
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
