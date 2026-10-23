import type { Entry } from './types'

export interface PlayerRoundStats {
  playerId: string
  turnMs: number
  /** Overtime on the player's own turns only. */
  turnOvertimeMs: number
  /** Time the player took to mark done in other players' reaction windows. */
  reactionMs: number
}

export interface RoundStats {
  round: number
  /** The round without the summary break at its end. */
  lengthMs: number
  strategyMs: number
  /** Own-turn time only. */
  actionMs: number
  reactionMs: number
  reactionCount: number
  statusMs: number
  agendaMs: number
  overtimeMs: number
  overLimitCount: number
  players: PlayerRoundStats[]
}

export interface PlayerGameStats {
  playerId: string
  turnMs: number
  turns: number
  averageMs: number
  worstMs: number
  /** Entries of any kind that passed their limit: turns, picks, and votes. */
  overLimitCount: number
  /** Overtime on the player's own turns only. */
  turnOvertimeMs: number
  /** Overtime on every limit: turns, picks, and votes. */
  limitOvertimeMs: number
  reactionMs: number
  /** Share of all own-turn time, from 0 to 1. */
  share: number
}

export interface LongTurn {
  playerId: string
  round: number
  durationMs: number
  card: number | null
}

export interface GameStats {
  totalMs: number
  rounds: number
  turns: number
  reactionCount: number
  averageTurnMs: number
  overtimeMs: number
  overLimitCount: number
  longestRound: { round: number; lengthMs: number } | null
  phases: {
    turnsMs: number
    reactionMs: number
    agendaMs: number
    statusMs: number
    strategyMs: number
    betweenMs: number
  }
  players: PlayerGameStats[]
  longestTurns: LongTurn[]
}

export function roundStats(
  entries: readonly Entry[],
  round: number,
  playerIds: readonly string[],
): RoundStats {
  const mine = entries.filter((e) => e.round === round && e.phase !== 'summary')
  const turns = mine.filter((e) => e.kind === 'turn')
  const windows = mine.filter((e) => e.kind === 'reaction')
  return {
    round,
    lengthMs: sum(mine),
    strategyMs: sum(mine.filter((e) => e.phase === 'strategy')),
    actionMs: sum(turns),
    reactionMs: sum(windows),
    reactionCount: windows.length,
    statusMs: sum(mine.filter((e) => e.phase === 'status')),
    agendaMs: sum(mine.filter((e) => e.phase === 'agenda')),
    overtimeMs: overtime(mine),
    overLimitCount: mine.filter((e) => e.overtimeMs > 0).length,
    players: playerIds
      .map((playerId) => {
        const own = turns.filter((e) => e.playerId === playerId)
        return {
          playerId,
          turnMs: sum(own),
          turnOvertimeMs: overtime(own),
          reactionMs: reactionTime(windows, playerId),
        }
      })
      .sort((a, b) => b.turnMs + b.reactionMs - (a.turnMs + a.reactionMs)),
  }
}

export function gameStats(
  entries: readonly Entry[],
  playerIds: readonly string[],
): GameStats {
  const turns = entries.filter((e) => e.kind === 'turn')
  const windows = entries.filter((e) => e.kind === 'reaction')
  const turnsMs = sum(turns)
  const rounds = Math.max(0, ...entries.map((e) => e.round))
  const roundLengths = Array.from({ length: rounds }, (_, i) => ({
    round: i + 1,
    lengthMs: roundStats(entries, i + 1, []).lengthMs,
  }))
  return {
    totalMs: sum(entries),
    rounds,
    turns: turns.length,
    reactionCount: windows.length,
    averageTurnMs: turns.length ? turnsMs / turns.length : 0,
    overtimeMs: overtime(entries),
    overLimitCount: entries.filter((e) => e.overtimeMs > 0).length,
    longestRound: roundLengths.reduce<GameStats['longestRound']>(
      (best, r) => (!best || r.lengthMs > best.lengthMs ? r : best),
      null,
    ),
    phases: {
      turnsMs,
      reactionMs: sum(windows),
      agendaMs: sum(entries.filter((e) => e.phase === 'agenda')),
      statusMs: sum(entries.filter((e) => e.phase === 'status')),
      strategyMs: sum(entries.filter((e) => e.phase === 'strategy')),
      betweenMs: sum(entries.filter((e) => e.phase === 'summary')),
    },
    players: playerIds
      .map((playerId) => {
        const own = turns.filter((e) => e.playerId === playerId)
        const mineAll = entries.filter((e) => e.playerId === playerId)
        const turnMs = sum(own)
        return {
          playerId,
          turnMs,
          turns: own.length,
          averageMs: own.length ? turnMs / own.length : 0,
          worstMs: Math.max(0, ...own.map((e) => e.durationMs)),
          overLimitCount: mineAll.filter((e) => e.overtimeMs > 0).length,
          turnOvertimeMs: overtime(own),
          limitOvertimeMs: overtime(mineAll),
          reactionMs: reactionTime(windows, playerId),
          share: turnsMs ? turnMs / turnsMs : 0,
        }
      })
      .sort((a, b) => b.turnMs - a.turnMs),
    longestTurns: [...turns]
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 4)
      .map((e) => ({
        playerId: e.playerId ?? '',
        round: e.round,
        durationMs: e.durationMs,
        card: e.card,
      })),
  }
}

function sum(entries: readonly Entry[]): number {
  return entries.reduce((total, e) => total + e.durationMs, 0)
}

function overtime(entries: readonly Entry[]): number {
  return entries.reduce((total, e) => total + e.overtimeMs, 0)
}

function reactionTime(windows: readonly Entry[], playerId: string): number {
  return windows.reduce(
    (total, e) =>
      total + (e.reactions?.find((r) => r.playerId === playerId)?.tookMs ?? 0),
    0,
  )
}
