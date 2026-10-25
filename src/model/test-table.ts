import { act, pause, resume, setLimits, startGame, undo } from './commands'
import { derive } from './derive'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import type { ActionInput, Game, Limits, Player } from './types'

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

/** Jaz, Kira, Tom, and Priya: a four-player table, with two cards each. */
export const FOUR_PLAYERS: Player[] = PLAYERS.slice(0, 4)

/** Cards for speaker Jaz. Initiative: Tom, Wren, Jaz, Sam, Kira, Priya. */
export const PICKS: Record<string, number> = {
  jaz: 3,
  kira: 5,
  tom: 1,
  priya: 7,
  sam: 4,
  wren: 2,
}

/** Two cards each, in pick order. Initiative: Tom 1, Priya 2, Jaz 3, Kira 5. */
export const FOUR_PICKS: Record<string, number[]> = {
  jaz: [3, 8],
  kira: [5, 6],
  tom: [1, 7],
  priya: [2, 4],
}

export const LIMITS_ON: Settings = { ...DEFAULT_SETTINGS, enforceLimits: true }

export function table(
  settings: Settings = DEFAULT_SETTINGS,
  speakerId = 'jaz',
  players: Player[] = PLAYERS,
) {
  return tableOf(startGame(players, speakerId, settings, T0))
}

/** The table as an older build saved it: a closed window resumes the turn. */
export function olderTable(settings: Settings = DEFAULT_SETTINGS) {
  const game = startGame(PLAYERS, 'jaz', settings, T0)
  return tableOf({ ...game, windowEndsTurn: false })
}

function tableOf(start: Game) {
  let now = start.startedAt
  let game = start
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
    setLimits(enforce: boolean, limits: Limits) {
      game = setLimits(game, enforce, limits, now)
    },
    view() {
      return derive(game, now)
    },
  }
}

export type Table = ReturnType<typeof tableOf>

/**
 * Every player picks in pick order, `ms` apart, then the action phase starts.
 * With two cards each, the picks go round the pick order twice.
 */
export function playStrategy(
  t: Table,
  picks: Record<string, number | number[]> = PICKS,
  ms = 10 * SEC,
): void {
  const cards = (id: string) => [picks[id] ?? []].flat()
  const order = t.view().pickOrder
  const rounds = Math.max(...order.map((id) => cards(id).length))
  for (let k = 0; k < rounds; k++) {
    for (const id of order) {
      const card = cards(id)[k]
      if (card === undefined) continue
      t.wait(ms)
      t.act({ kind: 'cardPicked', playerId: id, card })
    }
  }
  t.act({ kind: 'phaseStepped' })
}

/** Every player passes at once, which ends the action phase. */
export function passAll(t: Table): void {
  for (let i = 0; i < PLAYERS.length; i++) t.act({ kind: 'passed' })
}
