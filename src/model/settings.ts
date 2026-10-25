import type { ExpansionId } from './factions'
import type { Limits, LimitsChange, TimerKey } from './types'

export const ALARM_SOUNDS = ['klaxon', 'chime', 'beep'] as const
export type AlarmSound = (typeof ALARM_SOUNDS)[number]

/** Whether each expansion is in play. The base game always is. */
export type Expansions = Record<ExpansionId, boolean>

export interface Settings {
  /** Master switch. Off means pure tracking: no limit ever applies. */
  enforceLimits: boolean
  limits: Limits
  alarmOn: boolean
  alarmSound: AlarmSound
  keepAwake: boolean
  /** Show each player's game total on the rail, not only the current turn. */
  showCumulative: boolean
  /** The expansions that the table plays with. Setup offers their factions. */
  expansions: Expansions
}

/** Every expansion starts on, so a table that never chooses sees them all. */
export const DEFAULT_EXPANSIONS: Expansions = {
  pok: true,
  te: true,
  keleres: true,
}

export const DEFAULT_LIMITS: Limits = {
  turn: { on: true, ms: 180_000 },
  reactionWindow: { on: true, ms: 120_000 },
  agendaDiscussion: { on: true, ms: 240_000 },
  vote: { on: true, ms: 60_000 },
  statusPhase: { on: false, ms: 300_000 },
  strategyPick: { on: true, ms: 45_000 },
}

/** Limits ship off: tracking is the product, enforcement is opt-in. */
export const DEFAULT_SETTINGS: Settings = {
  enforceLimits: false,
  limits: DEFAULT_LIMITS,
  alarmOn: true,
  alarmSound: 'klaxon',
  keepAwake: true,
  showCumulative: true,
  expansions: DEFAULT_EXPANSIONS,
}

/** The limit for a timer at wall-clock time `at`, or null for no limit. */
export function limitAt(
  log: readonly LimitsChange[],
  key: TimerKey,
  at: number,
): number | null {
  let current: LimitsChange | undefined
  for (const change of log) {
    if (change.at > at) break
    current = change
  }
  if (!current?.enforce) return null
  const limit = current.limits[key]
  return limit.on ? limit.ms : null
}
