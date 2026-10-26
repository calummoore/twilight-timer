import { foldGame } from './fold'
import type { Game, Phase } from './types'

/** What a list of games shows of one game. */
export interface GameSummary {
  players: number
  round: number
  /** The phase, or 'lobby' before the start. */
  phase: Phase | 'lobby'
}

export function gameSummary(game: Game | null, players: number): GameSummary {
  if (!game) return { players, round: 1, phase: 'lobby' }
  const s = foldGame(game)
  return { players: game.players.length, round: s.round, phase: s.phase }
}
