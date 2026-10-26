import { foldGame } from './fold'
import type { Game, Player } from './types'

/** The table ring: every player in clockwise order, as the seat moves left it. */

/** The players of a game in the order of `ring`, a list of their ids. */
export function playersOf(game: Game, ring: readonly string[]): Player[] {
  return ring.flatMap((id) => game.players.find((p) => p.id === id) ?? [])
}

/** Every player of a running game in ring order, also those who left. */
export function ringOf(game: Game): Player[] {
  return playersOf(game, foldGame(game).ring)
}
