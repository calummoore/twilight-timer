import { foldGame } from './fold'
import { gameClock, mergeIntervals } from './time'
import { DEFAULT_LIMITS, type Settings } from './settings'
import { expireReaction } from './fold-state'
import type {
  ActionInput,
  Game,
  Limits,
  Player,
  TimerKey,
  TimerLimit,
} from './types'

export function startGame(
  players: Player[],
  speakerId: string,
  settings: Settings,
  now: number,
): Game {
  return {
    version: 2,
    startedAt: now,
    timeBase: 'device',
    players,
    firstSpeakerId: speakerId,
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

/**
 * Appends an action with tap id `id`. Returns the same game when the action
 * is not valid, or when the log already holds a tap with that id.
 */
export function act(
  game: Game,
  input: ActionInput,
  now: number,
  id: string,
): Game {
  if (isPaused(game) || game.actions.some((a) => a.id === id)) return game
  const at = Math.max(now, game.actions.at(-1)?.at ?? game.startedAt)
  const next = { ...game, actions: [...game.actions, { ...input, id, at }] }
  const { rejected } = foldGame(next)
  return rejected.includes(next.actions.length - 1) ? game : next
}

/**
 * Pops the last action, which must be the action with tap id `actionId`.
 * When the action changed which clock ran, the time since the action is
 * charged to nobody, so every clock returns to its value at the moment of
 * the action.
 */
export function undo(game: Game, now: number, actionId: string): Game {
  const last = game.actions.at(-1)
  if (!last || last.id !== actionId || isPaused(game)) return game
  const prev = { ...game, actions: game.actions.slice(0, -1) }
  const sameClock = clockKey(prev, last.at) === clockKey(game, last.at)
  const voids = sameClock
    ? game.voids
    : [...game.voids, { from: last.at, to: Math.max(now, last.at) }]
  return { ...prev, voids }
}

export function canUndo(game: Game): boolean {
  return game.actions.length > 0 && !isPaused(game)
}

export function pause(game: Game, now: number): Game {
  if (isPaused(game)) return game
  return { ...game, pauses: [...game.pauses, { from: now, to: null }] }
}

export function resume(game: Game, now: number): Game {
  if (!isPaused(game)) return game
  const pauses = game.pauses.map((p) =>
    p.to === null ? { from: p.from, to: Math.max(now, p.from) } : p,
  )
  return { ...game, pauses }
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

/** The limits in force after the newest change. */
export function limitsNow(game: Game): { enforce: boolean; limits: Limits } {
  const last = game.limitsLog.at(-1)
  return last
    ? { enforce: last.enforce, limits: last.limits }
    : { enforce: false, limits: DEFAULT_LIMITS }
}

/** Changes one timer from now on, and keeps every other limit in force. */
export function setLimit(
  game: Game,
  key: TimerKey,
  limit: TimerLimit,
  now: number,
): Game {
  const { enforce, limits } = limitsNow(game)
  return setLimits(game, enforce, { ...limits, [key]: limit }, now)
}

/** Turns the master switch on or off from now on. */
export function setEnforce(game: Game, enforce: boolean, now: number): Game {
  return setLimits(game, enforce, limitsNow(game).limits, now)
}

function clockKey(game: Game, wall: number): string {
  const s = foldGame(game)
  const excluded = mergeIntervals([...game.pauses, ...game.voids], wall)
  const ms = gameClock(game.startedAt, excluded)(wall)
  expireReaction(s, ms)
  const seg = s.segment
  const segKey = seg ? `${seg.kind}:${seg.playerId}:${seg.firstStartMs}` : '-'
  // The window end counts too: an extension changes which clock runs later.
  const r = s.reaction
  const end = r?.limitMs == null ? '-' : r.limitMs + r.extraMs
  const reactionKey = r ? `${r.startMs}:${end}` : '-'
  return `${segKey}|${reactionKey}|${s.phase}`
}
