import { parseAction } from './parse-action'
import { bool, isFields, isNumber, listOf } from './parse-util'
import { COLOURS, type Colour } from './rules'
import { ALARM_SOUNDS, DEFAULT_SETTINGS, type Settings } from './settings'
import {
  TIMER_KEYS,
  type Game,
  type Interval,
  type Limits,
  type LimitsChange,
  type Player,
} from './types'

/** The parts that every stored game version shares. */
export interface GameBase {
  startedAt: number
  players: Player[]
  firstSpeakerId: string
  pauses: Interval[]
  voids: Interval[]
  limitsLog: LimitsChange[]
}

/** Narrows the parts that every version shares, or returns null. */
export function parseGameBase(raw: unknown): GameBase | null {
  if (!isFields(raw)) return null
  const players = listOf(raw.players, parsePlayer)
  const pauses = listOf(raw.pauses, parseInterval)
  const voids = listOf(raw.voids, parseInterval)
  const limitsLog = listOf(raw.limitsLog, parseLimitsChange)
  const { startedAt, firstSpeakerId } = raw
  if (!players || !pauses || !voids || !limitsLog) return null
  if (!isNumber(startedAt) || typeof firstSpeakerId !== 'string') return null
  if (!players.some((p) => p.id === firstSpeakerId)) return null
  return { startedAt, players, firstSpeakerId, pauses, voids, limitsLog }
}

/** Narrows a version 2 game, or returns null when it is not valid. */
export function parseGame(raw: unknown): Game | null {
  if (!isFields(raw) || raw.version !== 2) return null
  const base = parseGameBase(raw)
  const actions = listOf(raw.actions, parseAction)
  const { timeBase } = raw
  if (!base || !actions) return null
  if (timeBase !== 'device' && timeBase !== 'server') return null
  return { version: 2, timeBase, ...base, actions }
}

/** Reads stored settings. Missing or broken fields fall back to defaults. */
export function parseSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS
  if (!isFields(raw)) return d
  const sound = ALARM_SOUNDS.find((s) => s === raw.alarmSound)
  return {
    enforceLimits: bool(raw.enforceLimits, d.enforceLimits),
    limits: parseLimits(raw.limits) ?? d.limits,
    alarmOn: bool(raw.alarmOn, d.alarmOn),
    alarmSound: sound ?? d.alarmSound,
    keepAwake: bool(raw.keepAwake, d.keepAwake),
    showCumulative: bool(raw.showCumulative, d.showCumulative),
    allowCompanions: bool(raw.allowCompanions, d.allowCompanions),
  }
}

function parsePlayer(raw: unknown): Player | null {
  if (!isFields(raw)) return null
  const { id, name, colour, faction } = raw
  const c: Colour | undefined = COLOURS.find((x) => x === colour)
  if (typeof id !== 'string' || typeof name !== 'string' || !c) return null
  if (typeof faction !== 'string') return null
  return { id, name, colour: c, faction }
}

function parseInterval(raw: unknown): Interval | null {
  if (!isFields(raw) || !isNumber(raw.from)) return null
  if (raw.to !== null && !isNumber(raw.to)) return null
  return { from: raw.from, to: raw.to }
}

function parseLimitsChange(raw: unknown): LimitsChange | null {
  if (!isFields(raw) || !isNumber(raw.at)) return null
  const limits = parseLimits(raw.limits)
  if (typeof raw.enforce !== 'boolean' || !limits) return null
  return { at: raw.at, enforce: raw.enforce, limits }
}

export function parseLimits(raw: unknown): Limits | null {
  if (!isFields(raw)) return null
  const out: Partial<Limits> = {}
  for (const key of TIMER_KEYS) {
    const limit = raw[key]
    if (!isFields(limit) || typeof limit.on !== 'boolean') return null
    if (!isNumber(limit.ms) || limit.ms <= 0) return null
    out[key] = { on: limit.on, ms: limit.ms }
  }
  return isComplete(out) ? out : null
}

function isComplete(limits: Partial<Limits>): limits is Limits {
  return TIMER_KEYS.every((key) => limits[key] !== undefined)
}
