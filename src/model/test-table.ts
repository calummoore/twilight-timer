import { aim } from './aim'
import { act, pause, resume, setLimits, startGame, undo } from './commands'
import { derive } from './derive'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import type { ActionInput, Game, Intent, Limits, Player } from './types'

/** Test support: a six-player table with a fake clock. */

export const T0 = 1_700_000_000_000
export const SEC = 1000
export const MIN = 60 * SEC

export const PLAYERS: Player[] = [
  { id: 'jaz', name: 'Jaz', colour: 'blue', faction: 'Federation of Sol' },
  { id: 'kira', name: 'Kira', colour: 'red', faction: 'Embers of Muaat' },
  { id: 'tom', name: 'Tom', colour: 'green', faction: 'Arborec' },
  {
    id: 'priya',
    name: 'Priya',
    colour: 'yellow',
    faction: 'Emirates of Hacan',
  },
  { id: 'sam', name: 'Sam', colour: 'purple', faction: 'Nekro Virus' },
  { id: 'wren', name: 'Wren', colour: 'orange', faction: 'Argent Flight' },
]

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
) {
  let now = T0
  let taps = 0
  let game: Game = startGame(PLAYERS, speakerId, settings, now)
  const apply = (input: ActionInput, id: string): boolean => {
    const before = game
    game = act(game, input, now, id)
    return game !== before
  }
  return {
    get game() {
      return game
    },
    get now() {
      return now
    },
    wait(ms: number) {
      now += ms
    },
    /** Taps as a screen does: aims the intent at the view of now. */
    act(intent: Intent): boolean {
      const input = aim(derive(game, now), intent)
      return input !== null && apply(input, `tap-${++taps}`)
    },
    /** Applies an aimed input, as a tap from another device would. */
    send(input: ActionInput, id = `tap-${++taps}`): boolean {
      return apply(input, id)
    },
    /** Aims an intent at the view of now without applying it. */
    aim(intent: Intent): ActionInput | null {
      return aim(derive(game, now), intent)
    },
    /** Undoes the last action, as the Undo button does. */
    undo() {
      const last = game.actions.at(-1)
      if (last) game = undo(game, now, last.id)
    },
    /** Undoes the action with tap id `id`, as a late tap would. */
    undoTap(id: string) {
      game = undo(game, now, id)
    },
    pause() {
      game = pause(game, now)
    },
    resume() {
      game = resume(game, now)
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
