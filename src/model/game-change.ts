import { act, pause, resume, setEnforce, setLimit, undo } from './commands'
import type { GameChange } from './share'
import type { Game } from './types'

/**
 * Applies a change to the game. The server applies it with its stamped
 * time, and each device applies the same change, so every copy agrees.
 * Returns the same game when the change does not apply.
 */
export function applyGameChange(game: Game, change: GameChange): Game {
  const { at, tapId } = change
  switch (change.kind) {
    case 'act':
      return act(game, change.input, at, tapId)
    case 'undo':
      return undo(game, at, change.actionId)
    case 'pause':
      return pause(game, at)
    case 'resume':
      return resume(game, at)
    case 'limit':
      return setLimit(game, change.timer, change.limit, at)
    case 'enforce':
      return setEnforce(game, change.enforce, at)
  }
}

/** The newest time in the game: the last action, pause, undo, or limit. */
export function newestTime(game: Game): number {
  let newest = game.startedAt
  for (const a of game.actions) newest = Math.max(newest, a.at)
  for (const i of [...game.pauses, ...game.voids]) {
    newest = Math.max(newest, i.from, i.to ?? i.from)
  }
  for (const l of game.limitsLog) newest = Math.max(newest, l.at)
  return newest
}

/**
 * The time of a change: its tap time, but never before the newest time in
 * the game and never after the server clock. So every log stays in order.
 */
export function stampTime(
  game: Game,
  tapAt: number,
  serverNow: number,
): number {
  return Math.max(newestTime(game), Math.min(tapAt, serverNow))
}
