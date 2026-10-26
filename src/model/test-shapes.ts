import type { Game } from './types'

/**
 * Test support: a game as the builds that gave each player one card stored
 * it. Their strategic actions logged no card.
 */

/** The log with no card field on each strategic action. */
export function cardlessLog(game: Game) {
  return game.actions.map((a) =>
    a.kind === 'strategyCardPlayed' ? { kind: a.kind, at: a.at } : a,
  )
}

/** The game with a null card on each strategic action, as those builds left it. */
export function withNullCards(game: Game): Game {
  const actions = game.actions.map((a) =>
    a.kind === 'strategyCardPlayed' ? { ...a, card: null } : a,
  )
  return { ...game, actions }
}
