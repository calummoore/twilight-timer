import {
  act,
  pause,
  resume,
  setLimits,
  setPauseReason,
  startGame,
  undo,
} from './commands'
import { derive } from './derive'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import type { ActionInput, Game, Limits, PauseReason, Player } from './types'

/** Test support: a six-player table with a fake clock. */

export const T0 = 1_700_000_000_000
export const SEC = 1000
export const MIN = 60 * SEC

export const PLAYERS: Player[] = [
  { id: 'jaz', name: 'Jaz', colour: 'blue', factionId: 'sol' },
  { id: 'kira', name: 'Kira', colour: 'red', factionId: 'muaat' },
  { id: 'tom', name: 'Tom', colour: 'green', factionId: 'arborec' },
  { id: 'priya', name: 'Priya', colour: 'yellow', factionId: 'hacan' },
  { id: 'sam', name: 'Sam', colour: 'purple', factionId: 'nekro' },
  { id: 'wren', name: 'Wren', colour: 'orange', factionId: 'argent' },
]

/** The same table with Sam as the Naalu, who holds the "0" token. */
export const NAALU_PLAYERS: Player[] = PLAYERS.map((p) =>
  p.id === 'sam' ? { ...p, factionId: 'naalu' } : p,
)

/** Cards for speaker Jaz. Initiative: Tom, Wren, Jaz, Sam, Kira, Priya. */
export const PICKS: Record<string, number> = {
  jaz: 3,
  kira: 5,
  tom: 1,
  priya: 7,
  sam: 4,
  wren: 2,
}

export const LIMITS_ON: Settings = { ...DEFAULT_SETTINGS, enforceLimits: true }

export function table(
  settings: Settings = DEFAULT_SETTINGS,
  speakerId = 'jaz',
  players: Player[] = PLAYERS,
) {
  let now = T0
  let game: Game = startGame(players, speakerId, settings, now)
  return {
    get game() {
      return game
    },
    wait(ms: number) {
      now += ms
    },
    /** Applies an action and reports whether the game accepted it. */
    act(input: ActionInput): boolean {
      const before = game
      game = act(game, input, now)
      return game !== before
    },
    undo() {
      game = undo(game, now)
    },
    pause() {
      game = pause(game, now)
    },
    resume() {
      game = resume(game, now)
    },
    /** Sets the reason of the open pause, or null for a plain pause. */
    pauseReason(reason: PauseReason | null) {
      game = setPauseReason(game, reason, now)
    },
    setLimits(enforce: boolean, limits: Limits) {
      game = setLimits(game, enforce, limits, now)
    },
    view() {
      return derive(game, now)
    },
  }
}

export type Table = ReturnType<typeof table>

/** Every player picks in pick order, `ms` apart, then the action phase starts. */
export function playStrategy(t: Table, picks = PICKS, ms = 10 * SEC): void {
  for (const id of t.view().pickOrder) {
    const card = picks[id]
    if (card === undefined) continue
    t.wait(ms)
    t.act({ kind: 'cardPicked', playerId: id, card })
  }
  t.act({ kind: 'phaseStepped' })
}

/** Every player passes at once, which ends the action phase. */
export function passAll(t: Table): void {
  for (let i = 0; i < PLAYERS.length; i++) t.act({ kind: 'passed' })
}
