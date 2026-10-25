import { gameStats, roundStats, type PlayerGameStats } from './stats'
import type { Phase, Player } from './types'
import type { GameView, TimerView } from './view'

/** What one player's phone shows. */
export interface PlayerView {
  player: Player
  phase: Phase
  /** The player who acts now: the picker, the active player, or the voter. */
  actorId: string | null
  timer: TimerView | null
  /** The action phase, this player's turn, and no reaction window open. */
  myTurn: boolean
  reaction: {
    card: number
    byId: string
    elapsedMs: number
    limitMs: number | null
    /** This player's tile, or null when the window is their own. */
    mine: 'open' | 'done' | null
    doneCount: number
    tiles: number
  } | null
  passed: boolean
  card: number | null
  cardPlayed: boolean
  /** Turns until this player acts again, or null when they will not. */
  turnsAway: number | null
  /** The players who act before this player, in order. */
  before: string[]
  /** The other players who passed this round. */
  passedOthers: string[]
  stats: PlayerGameStats & { rank: number; fastestRound: number | null }
}

export function playerView(g: GameView, playerId: string): PlayerView | null {
  const player = g.players.find((p) => p.id === playerId)
  if (!player) return null
  const v = g.view
  const all = gameStats(
    g.entries,
    g.players.map((p) => p.id),
  )
  const index = all.players.findIndex((p) => p.playerId === playerId)
  const mine = all.players[index]
  if (!mine) return null
  const base: PlayerView = {
    player,
    phase: v.phase,
    actorId: null,
    timer: g.timer,
    myTurn: false,
    reaction: null,
    passed: false,
    card: null,
    cardPlayed: false,
    turnsAway: null,
    before: [],
    passedOthers: [],
    stats: { ...mine, rank: index + 1, fastestRound: fastest(g, playerId) },
  }
  switch (v.phase) {
    case 'strategy':
      return { ...base, actorId: v.pickerId }
    case 'agenda':
      return {
        ...base,
        actorId: v.voters.find((x) => x.state === 'now')?.playerId ?? null,
      }
    case 'action': {
      const row = v.rail.find((r) => r.playerId === playerId)
      const r = v.reaction
      const order = v.rail.map((x) => x.playerId)
      const open = order.filter(
        (id) => v.rail.find((x) => x.playerId === id)?.state !== 'passed',
      )
      const passed = row?.state === 'passed'
      const start = open.indexOf(v.activeId)
      const queue =
        start < 0 ? [] : [...open.slice(start), ...open.slice(0, start)]
      const at = queue.indexOf(playerId)
      return {
        ...base,
        actorId: v.activeId,
        myTurn: v.activeId === playerId && !r,
        reaction: r && {
          card: r.card,
          byId: r.byId,
          elapsedMs: r.elapsedMs,
          limitMs: r.limitMs,
          mine: tileOf(r.tiles, playerId),
          doneCount: r.doneCount,
          tiles: r.tiles.length,
        },
        passed,
        card: row?.card ?? null,
        cardPlayed: row?.cardPlayed ?? false,
        turnsAway: passed || at < 0 ? null : at,
        before: passed || at < 0 ? [] : queue.slice(0, at),
        passedOthers: v.rail
          .filter((x) => x.state === 'passed' && x.playerId !== playerId)
          .map((x) => x.playerId),
      }
    }
    default:
      return base
  }
}

function tileOf(
  tiles: { playerId: string; tookMs: number | null }[],
  playerId: string,
): 'open' | 'done' | null {
  const tile = tiles.find((t) => t.playerId === playerId)
  if (!tile) return null
  return tile.tookMs === null ? 'open' : 'done'
}

/** The round with this player's least own-turn time, among played rounds. */
function fastest(g: GameView, playerId: string): number | null {
  let best: { round: number; ms: number } | null = null
  for (let round = 1; round <= g.round; round++) {
    const stats = roundStats(g.entries, round, [playerId])
    const ms = stats.players[0]?.turnMs ?? 0
    if (ms > 0 && (!best || ms < best.ms)) best = { round, ms }
  }
  return best?.round ?? null
}
