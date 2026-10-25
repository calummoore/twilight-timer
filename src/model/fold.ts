import {
  close,
  closeReaction,
  createState,
  currentPicker,
  currentVoter,
  expireReaction,
  nextActive,
  open,
  openStrategySegment,
  openVoteSegment,
  startAgenda,
  startTurn,
  turnOrder,
  type FoldState,
} from './fold-state'
import { AGENDAS_PER_ROUND, STATUS_STEPS, isStrategyCard } from './rules'
import { limitAt } from './settings'
import { gameClock, mergeIntervals } from './time'
import type { Action, Game } from './types'

/**
 * Folds the action log into state. `toMs` maps wall-clock time to game
 * time. An action that is not valid in its state is skipped and listed in
 * `rejected`.
 */
export function foldGame(game: Game, toMs = actionClock(game)): FoldState {
  const s = createState(game)
  game.actions.forEach((action, index) => {
    const ms = toMs(action.at)
    expireReaction(s, ms)
    if (!step(s, action, ms)) s.rejected.push(index)
  })
  return s
}

/** The clock for logged actions. No action happens inside a pause. */
export function actionClock(game: Game): (wall: number) => number {
  const excluded = mergeIntervals(
    [...game.pauses, ...game.voids],
    Number.MAX_SAFE_INTEGER,
  )
  return gameClock(game.startedAt, excluded)
}

function step(s: FoldState, a: Action, ms: number): boolean {
  if (s.phase === 'ended') return false
  switch (a.kind) {
    case 'speakerMoved':
      return moveSpeaker(s, a.playerId, ms, a.at)
    case 'naaluTokenMoved':
      return moveNaaluToken(s, a.playerId)
    case 'custodiansSet':
      if (s.custodiansRemoved === a.removed) return false
      s.custodiansRemoved = a.removed
      return true
    case 'cardPicked':
      return pickCard(s, a.playerId, a.card, ms, a.at)
    case 'phaseStepped':
      return stepPhase(s, ms, a.at)
    case 'turnEnded':
    case 'passed':
      return endTurn(s, a.kind === 'passed', ms, a.at)
    case 'strategyCardPlayed':
      return playStrategyCard(s, ms, a.at)
    case 'reactionDone': {
      const r = s.reaction
      if (!r || !r.others.includes(a.playerId) || r.done.has(a.playerId)) {
        return false
      }
      r.done.set(a.playerId, ms - r.startMs)
      if (r.done.size === r.others.length) endReaction(s, ms, a.at)
      return true
    }
    case 'reactionExtended':
      if (!s.reaction || s.reaction.limitMs === null || a.ms <= 0) return false
      s.reaction.extraMs += a.ms
      return true
    case 'reactionClosed':
      if (!s.reaction) return false
      endReaction(s, ms, a.at)
      return true
    case 'statusStepToggled':
      if (s.phase !== 'status') return false
      if (a.step < 0 || a.step >= STATUS_STEPS.length) return false
      s.statusSteps[a.step] = !s.statusSteps[a.step]
      return true
    case 'votingOpened':
      if (s.agenda?.stage !== 'discussion') return false
      close(s, ms, a.at)
      openVoteSegment(s, ms)
      return true
    case 'voteCast': {
      const voter = currentVoter(s)
      if (s.agenda?.stage !== 'voting' || !voter) return false
      close(s, ms, a.at)
      s.agenda.voted.push(voter)
      openVoteSegment(s, ms)
      return true
    }
    case 'agendaResolved':
      if (!s.agenda) return false
      close(s, ms, a.at)
      if (s.agenda.n < AGENDAS_PER_ROUND) startAgenda(s, s.agenda.n + 1, ms)
      else startSummary(s, ms)
      return true
    case 'gameEnded':
      closeReaction(s, ms)
      close(s, ms, a.at)
      s.phase = 'ended'
      s.endedMs = ms
      s.activeId = null
      s.agenda = null
      return true
  }
}

function moveSpeaker(s: FoldState, id: string, ms: number, wall: number) {
  if (!s.seats.includes(id) || id === s.speakerId) return false
  s.speakerId = id
  // The pick or vote order re-derives, so the clock follows the new player.
  const seg = s.segment
  if (s.phase === 'strategy' && seg && seg.playerId !== currentPicker(s)) {
    close(s, ms, wall)
    openStrategySegment(s, ms)
  }
  if (s.agenda?.stage === 'voting' && seg && seg.playerId !== currentVoter(s)) {
    close(s, ms, wall)
    openVoteSegment(s, ms)
  }
  return true
}

/**
 * Gift of Prescience: another player holds the token for this round. The
 * token returns to its owner when the next round starts.
 */
function moveNaaluToken(s: FoldState, id: string): boolean {
  if (s.phase !== 'strategy' || s.game.naaluTokenOwnerId === null) return false
  if (!s.seats.includes(id) || id === s.naaluTokenHolderId) return false
  s.naaluTokenHolderId = id
  return true
}

function pickCard(
  s: FoldState,
  id: string,
  card: number,
  ms: number,
  wall: number,
) {
  if (s.phase !== 'strategy' || currentPicker(s) !== id) return false
  if (!isStrategyCard(card) || [...s.picks.values()].includes(card)) {
    return false
  }
  close(s, ms, wall)
  s.picks.set(id, card)
  openStrategySegment(s, ms)
  return true
}

function stepPhase(s: FoldState, ms: number, wall: number): boolean {
  switch (s.phase) {
    case 'strategy': {
      if (s.picks.size < s.seats.length) return false
      const first = turnOrder(s)[0]
      if (!first) return false
      close(s, ms, wall)
      s.phase = 'action'
      startTurn(s, first.playerId, ms)
      return true
    }
    case 'status':
      close(s, ms, wall)
      if (s.custodiansRemoved) startAgenda(s, 1, ms)
      else startSummary(s, ms)
      return true
    case 'summary':
      close(s, ms, wall)
      s.pickHistory.push(s.picks)
      s.picks = new Map()
      s.passed = new Set()
      s.scPlayed = new Set()
      s.turnCounts = new Map()
      s.naaluTokenHolderId = s.game.naaluTokenOwnerId
      s.round += 1
      s.phase = 'strategy'
      openStrategySegment(s, ms)
      return true
    default:
      return false
  }
}

function endTurn(s: FoldState, pass: boolean, ms: number, wall: number) {
  if (s.phase !== 'action' || s.reaction || !s.activeId) return false
  close(s, ms, wall)
  if (pass) s.passed.add(s.activeId)
  const next = nextActive(s)
  if (next) {
    startTurn(s, next, ms)
    return true
  }
  // The last unpassed player passed: the status phase begins.
  s.activeId = null
  s.phase = 'status'
  s.statusSteps = STATUS_STEPS.map(() => false)
  open(s, 'status', null, 'statusPhase', ms)
  return true
}

function playStrategyCard(s: FoldState, ms: number, wall: number): boolean {
  const id = s.activeId
  const seg = s.segment
  const card = id === null ? undefined : s.picks.get(id)
  if (s.phase !== 'action' || s.reaction || !id || !seg || !card) return false
  if (s.scPlayed.has(id)) return false
  s.scPlayed.add(id)
  // The active clock stops. The window is charged to nobody.
  s.suspended = {
    ...seg,
    card,
    bankedMs: seg.bankedMs + (ms - seg.startMs),
  }
  s.segment = null
  s.reaction = {
    card,
    byId: id,
    speakerAtStart: s.speakerId,
    startMs: ms,
    limitMs: limitAt(s.game.limitsLog, 'reactionWindow', wall),
    extraMs: 0,
    done: new Map(),
    others: s.seats.filter((other) => other !== id),
  }
  return true
}

/**
 * A tap closes the reaction window. The strategic action was the action of
 * the turn, so the turn ends too, except in a game from an older build.
 */
function endReaction(s: FoldState, ms: number, wall: number): void {
  closeReaction(s, ms)
  if (s.game.windowEndsTurn) endTurn(s, false, ms, wall)
}

function startSummary(s: FoldState, ms: number): void {
  s.agenda = null
  s.phase = 'summary'
  open(s, 'table', null, null, ms)
}
