import { canUndo, isPaused } from './commands'
import { foldGame } from './fold'
import {
  currentPicker,
  expireReaction,
  reactionEntry,
  toEntry,
  turnOrder,
  type FoldState,
} from './fold-state'
import { pickOrder, voteOrder } from './orders'
import { STRATEGY_CARDS } from './rules'
import { gameClock, mergeIntervals } from './time'
import type { Entry, Game } from './types'
import type { GameView, PhaseView, RailRow, TimerView } from './view'

/** Everything a screen shows, at wall-clock time `now`. */
export function derive(game: Game, now: number): GameView {
  const s = foldGame(game)
  const excluded = mergeIntervals([...game.pauses, ...game.voids], now)
  const lastStart = s.segment?.startMs ?? s.reaction?.startMs ?? 0
  const ms =
    s.endedMs ?? Math.max(lastStart, gameClock(game.startedAt, excluded)(now))
  expireReaction(s, ms)
  const entries = [...s.entries, ...runningEntries(s, ms, now)]
  return {
    round: s.round,
    players: game.players,
    speakerId: s.speakerId,
    pickOrder: pickOrder(s.seats, s.speakerId),
    voteOrder: voteOrder(s.seats, s.speakerId),
    custodiansRemoved: s.custodiansRemoved,
    gameMs: ms,
    paused: isPaused(game),
    canUndo: canUndo(game),
    timer: timerView(s, ms, now),
    entries,
    view: phaseView(s, entries, ms),
  }
}

function runningEntries(s: FoldState, ms: number, now: number): Entry[] {
  const out: Entry[] = []
  if (s.segment) out.push(toEntry(s, s.segment, ms, now, true))
  if (s.reaction) {
    out.push(reactionEntry(s, s.reaction, ms, true))
    if (s.suspended)
      out.push(toEntry(s, s.suspended, s.suspended.startMs, now, true))
  }
  return out
}

function timerView(s: FoldState, ms: number, now: number): TimerView | null {
  const r = s.reaction
  if (r) {
    return {
      key: `reaction:${r.startMs}`,
      kind: 'reaction',
      playerId: null,
      elapsedMs: ms - r.startMs,
      limitMs: r.limitMs === null ? null : r.limitMs + r.extraMs,
    }
  }
  const seg = s.segment
  if (!seg) return null
  const entry = toEntry(s, seg, ms, now, true)
  return {
    key: `${seg.kind}:${seg.playerId ?? 'table'}:${seg.firstStartMs}`,
    kind: seg.kind,
    playerId: seg.playerId,
    elapsedMs: entry.durationMs,
    limitMs: entry.limitMs,
  }
}

function phaseView(s: FoldState, entries: Entry[], ms: number): PhaseView {
  switch (s.phase) {
    case 'strategy':
      return {
        phase: 'strategy',
        pickerId: currentPicker(s),
        owners: Object.fromEntries(
          [...s.picks].map(([id, card]) => [card, id]),
        ),
        tradeGoods: tradeGoods(s),
        order: turnOrder(s),
        naaluTokenOwnerId: s.game.naaluTokenOwnerId,
        naaluTokenHolderId: s.naaluTokenHolderId,
      }
    case 'action':
      return actionView(s, entries, ms)
    case 'status':
      return { phase: 'status', steps: [...s.statusSteps] }
    case 'agenda': {
      const n = s.agenda?.n ?? 1
      const mine = entries.filter((e) => e.round === s.round && e.agenda === n)
      const discussion = mine.find((e) => e.kind === 'discussion')
      const voted = s.agenda?.voted ?? []
      const votingId = s.segment?.kind === 'vote' ? s.segment.playerId : null
      return {
        phase: 'agenda',
        agenda: n,
        stage: s.agenda?.stage ?? 'discussion',
        voters: voteOrder(s.seats, s.speakerId).map((playerId) => ({
          playerId,
          state: voted.includes(playerId)
            ? 'done'
            : playerId === votingId
              ? 'now'
              : 'waiting',
          durationMs: voted.includes(playerId)
            ? sum(
                mine.filter(
                  (e) => e.kind === 'vote' && e.playerId === playerId,
                ),
              )
            : null,
        })),
        discussionMs: discussion?.durationMs ?? 0,
        discussionLimitMs: discussion?.limitMs ?? null,
      }
    }
    case 'summary':
      return { phase: 'summary' }
    case 'ended':
      return { phase: 'ended' }
  }
}

function actionView(s: FoldState, entries: Entry[], ms: number): PhaseView {
  const activeId = s.activeId ?? s.reaction?.byId ?? ''
  const order = turnOrder(s)
  const rail: RailRow[] = order.map(({ playerId, initiative }) => ({
    playerId,
    initiative,
    card: s.picks.get(playerId) ?? 0,
    state:
      playerId === activeId
        ? 'active'
        : s.passed.has(playerId)
          ? 'passed'
          : 'waiting',
    cardPlayed: s.scPlayed.has(playerId),
    totalMs: sum(
      entries.filter((e) => e.kind === 'turn' && e.playerId === playerId),
    ),
    turns: s.turnCounts.get(playerId) ?? 0,
  }))
  const r = s.reaction
  return {
    phase: 'action',
    activeId,
    turnNumber: s.turnCounts.get(activeId) ?? 0,
    rail,
    passedCount: s.passed.size,
    activeInitiative:
      order.find((slot) => slot.playerId === activeId)?.initiative ?? 0,
    activeCard: s.picks.get(activeId) ?? 0,
    cardPlayed: s.scPlayed.has(activeId),
    reaction: r && {
      card: r.card,
      byId: r.byId,
      elapsedMs: ms - r.startMs,
      limitMs: r.limitMs === null ? null : r.limitMs + r.extraMs,
      pausedTurnMs: s.suspended?.bankedMs ?? 0,
      tiles: r.others.map((playerId) => ({
        playerId,
        passed: s.passed.has(playerId),
        tookMs: r.done.get(playerId) ?? null,
      })),
      doneCount: r.done.size,
    },
  }
}

/** Each unpicked card gains a trade good per round until somebody picks it. */
function tradeGoods(s: FoldState): Record<number, number> {
  const out: Record<number, number> = {}
  for (const { number } of STRATEGY_CARDS) {
    let goods = 0
    for (let i = s.pickHistory.length - 1; i >= 0; i--) {
      if ([...(s.pickHistory[i]?.values() ?? [])].includes(number)) break
      goods += 1
    }
    out[number] = goods
  }
  return out
}

function sum(entries: Entry[]): number {
  return entries.reduce((total, e) => total + e.durationMs, 0)
}
