import { NAALU } from './factions'
import { foldGame } from './fold'
import type { Settings } from './settings'
import type {
  ActionInput,
  Game,
  Limits,
  Pause,
  PauseReason,
  Player,
  ReasonRange,
} from './types'

export function startGame(
  players: Player[],
  speakerId: string,
  settings: Settings,
  now: number,
): Game {
  return {
    version: 4,
    startedAt: now,
    players,
    firstSpeakerId: speakerId,
    naaluTokenOwnerId: players.find((p) => p.factionId === NAALU)?.id ?? null,
    actions: [],
    pauses: [],
    voids: [],
    limitsLog: [
      { at: now, enforce: settings.enforceLimits, limits: settings.limits },
    ],
  }
}

export function isPaused(game: Game): boolean {
  return game.pauses.some((p) => p.to === null)
}

/** Appends an action. Returns the same game when the action is not valid. */
export function act(game: Game, input: ActionInput, now: number): Game {
  if (isPaused(game)) return game
  const at = Math.max(now, game.actions.at(-1)?.at ?? game.startedAt)
  const next = { ...game, actions: [...game.actions, { ...input, at }] }
  const { rejected } = foldGame(next)
  return rejected.includes(next.actions.length - 1) ? game : next
}

/**
 * Pops the last action. The time since the action is charged to nobody,
 * so every clock returns to its value at the moment of the action.
 */
export function undo(game: Game, now: number): Game {
  const last = game.actions.at(-1)
  if (!last || isPaused(game)) return game
  return {
    ...game,
    actions: game.actions.slice(0, -1),
    voids: [...game.voids, { from: last.at, to: Math.max(now, last.at) }],
  }
}

export function canUndo(game: Game): boolean {
  return game.actions.length > 0 && !isPaused(game)
}

/** Starts a plain pause: a pause with no reason. */
export function pause(game: Game, now: number): Game {
  if (isPaused(game)) return game
  const plain: Pause = { from: now, to: null, reasons: [] }
  return { ...game, pauses: [...game.pauses, plain] }
}

/** Ends the open pause, and its open reason range with it. */
export function resume(game: Game, now: number): Game {
  if (!isPaused(game)) return game
  const pauses = game.pauses.map((p) => {
    if (p.to !== null) return p
    const to = Math.max(now, lastTime(p))
    return { ...p, to, reasons: endRanges(p.reasons, to) }
  })
  return { ...game, pauses }
}

/**
 * Gives the open pause a reason from `now` on, or makes the rest of it a
 * plain pause with null. The open reason range ends at `now`. Returns the
 * same game when no pause is open or when the reason does not change.
 */
export function setPauseReason(
  game: Game,
  reason: PauseReason | null,
  now: number,
): Game {
  const index = game.pauses.findIndex((p) => p.to === null)
  const open = game.pauses[index]
  if (!open) return game
  const current = open.reasons.find((r) => r.to === null)?.reason ?? null
  if (reason === current) return game
  const at = Math.max(now, lastTime(open))
  const reasons = endRanges(open.reasons, at)
  if (reason !== null) reasons.push({ reason, from: at, to: null })
  return { ...game, pauses: game.pauses.with(index, { ...open, reasons }) }
}

/** The latest time in a pause, so that its ranges stay in order. */
function lastTime(p: Pause): number {
  const last = p.reasons.at(-1)
  return Math.max(p.from, last?.to ?? last?.from ?? p.from)
}

function endRanges(ranges: readonly ReasonRange[], at: number): ReasonRange[] {
  return ranges.map((r) => (r.to === null ? { ...r, to: at } : r))
}

/** Limits apply from now on. Closed entries keep the limit of their time. */
export function setLimits(
  game: Game,
  enforce: boolean,
  limits: Limits,
  now: number,
): Game {
  return {
    ...game,
    limitsLog: [...game.limitsLog, { at: now, enforce, limits }],
  }
}
