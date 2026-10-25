import type { Game } from './types'

/**
 * Moves a game to the server clock. Every time in the game moves by
 * `offset`, the server clock minus the device clock, so no clock jumps.
 */
export function toServerTime(game: Game, offset: number): Game {
  if (game.timeBase === 'server') return game
  const move = (t: number) => t + offset
  return {
    ...game,
    timeBase: 'server',
    startedAt: move(game.startedAt),
    actions: game.actions.map((a) => ({ ...a, at: move(a.at) })),
    pauses: game.pauses.map((p) => ({
      from: move(p.from),
      to: p.to === null ? null : move(p.to),
    })),
    voids: game.voids.map((v) => ({
      from: move(v.from),
      to: v.to === null ? null : move(v.to),
    })),
    limitsLog: game.limitsLog.map((l) => ({ ...l, at: move(l.at) })),
  }
}

/** The time now for a game, from its time base and the clock offset. */
export function nowFor(
  game: Pick<Game, 'timeBase'>,
  deviceNow: number,
  offset: number,
): number {
  return game.timeBase === 'server' ? deviceNow + offset : deviceNow
}
