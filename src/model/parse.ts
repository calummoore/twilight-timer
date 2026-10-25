import { FACTIONS, isFactionId, type FactionId } from './factions'
import { COLOURS, type Colour } from './rules'
import { ALARM_SOUNDS, DEFAULT_SETTINGS, type Settings } from './settings'
import {
  TIMER_KEYS,
  type Action,
  type Game,
  type Interval,
  type Limits,
  type LimitsChange,
  type Player,
} from './types'

type Fields = Record<string, unknown>

/**
 * Narrows stored data to a game, or returns null when it is not valid. A game
 * of an older version gets the shape of the newest first, and one parser reads
 * every game. So a game that loads once loads again after the app saves it.
 */
export function parseGame(raw: unknown): Game | null {
  const game = isFields(raw) ? upgrade(raw) : null
  if (game?.version !== 4) return null
  const players = listOf(game.players, parsePlayer)
  const actions = listOf(game.actions, parseAction)
  const pauses = listOf(game.pauses, parseInterval)
  const voids = listOf(game.voids, parseInterval)
  const limitsLog = listOf(game.limitsLog, parseLimitsChange)
  const { startedAt, firstSpeakerId } = game
  if (!players || !actions || !pauses || !voids || !limitsLog) return null
  if (!isNumber(startedAt) || typeof firstSpeakerId !== 'string') return null
  const isPlayer = (id: unknown) => players.some((p) => p.id === id)
  if (!isPlayer(firstSpeakerId)) return null
  const owner = game.naaluTokenOwnerId
  if (owner !== null && (typeof owner !== 'string' || !isPlayer(owner))) {
    return null
  }
  return {
    version: 4,
    startedAt,
    players,
    firstSpeakerId,
    naaluTokenOwnerId: owner,
    actions,
    pauses,
    voids,
    limitsLog,
  }
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
  }
}

/**
 * Gives a stored game of an older version the shape of the next version, until
 * it has the shape of the newest. Another version stays as it is, so the
 * parser rejects it.
 */
function upgrade(raw: Fields): Fields {
  switch (raw.version) {
    case 1:
      // Builds before the Naalu token stored the typed faction text.
      return upgrade({
        ...raw,
        version: 2,
        players: mapList(raw.players, typedFaction),
        naaluTokenOwnerId: null,
      })
    case 2:
      // Builds before player removal have the shape of version 3.
      return upgrade({ ...raw, version: 3 })
    case 3:
      // Builds that gave each player one card logged no card.
      return { ...raw, version: 4, actions: mapList(raw.actions, cardless) }
    default:
      return raw
  }
}

/**
 * A version 1 player: the typed faction becomes the id from the list. A
 * faction that is not text stays invalid.
 */
function typedFaction(raw: unknown): unknown {
  if (!isFields(raw)) return raw
  const { faction, ...player } = raw
  const factionId =
    typeof faction === 'string' ? factionFromText(faction) : undefined
  return { ...player, factionId }
}

/** A strategic action that logged no card gets a null card. */
function cardless(raw: unknown): unknown {
  if (!isFields(raw) || raw.kind !== 'strategyCardPlayed') return raw
  return { ...raw, card: null }
}

function parsePlayer(raw: unknown): Player | null {
  if (!isFields(raw)) return null
  const { id, name, colour, factionId } = raw
  const c: Colour | undefined = COLOURS.find((x) => x === colour)
  if (typeof id !== 'string' || typeof name !== 'string' || !c) return null
  if (factionId !== null && !isFactionId(factionId)) return null
  return { id, name, colour: c, factionId }
}

/** A typed faction name or id from the list, in any letter case, or null. */
function factionFromText(text: string): FactionId | null {
  const key = text.trim().toLowerCase()
  const match = FACTIONS.find(
    (f) => f.id === key || f.name.toLowerCase() === key,
  )
  return match?.id ?? null
}

function parseAction(raw: unknown): Action | null {
  if (!isFields(raw) || !isNumber(raw.at)) return null
  const { at, playerId, card, ms, step, removed } = raw
  const id = typeof playerId === 'string' ? playerId : null
  switch (raw.kind) {
    case 'cardPicked':
      return id && isNumber(card)
        ? { kind: raw.kind, at, playerId: id, card }
        : null
    case 'reactionDone':
    case 'speakerMoved':
    case 'naaluTokenMoved':
    case 'playerRemoved':
      return id ? { kind: raw.kind, at, playerId: id } : null
    case 'reactionExtended':
      return isNumber(ms) ? { kind: raw.kind, at, ms } : null
    case 'statusStepToggled':
      return isNumber(step) ? { kind: raw.kind, at, step } : null
    case 'custodiansSet':
      return typeof removed === 'boolean'
        ? { kind: raw.kind, at, removed }
        : null
    case 'strategyCardPlayed':
      // An upgraded game from an older build has a null card.
      return isNumber(card) || card === null
        ? { kind: raw.kind, at, card }
        : null
    case 'phaseStepped':
    case 'turnEnded':
    case 'passed':
    case 'reactionClosed':
    case 'votingOpened':
    case 'voteCast':
    case 'agendaResolved':
    case 'gameEnded':
      return { kind: raw.kind, at }
    default:
      return null
  }
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

function parseLimits(raw: unknown): Limits | null {
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

/** Maps each item of a list, and keeps anything else for the parser. */
function mapList(raw: unknown, map: (item: unknown) => unknown): unknown {
  return Array.isArray(raw) ? raw.map(map) : raw
}

function listOf<T>(
  raw: unknown,
  parse: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(raw)) return null
  const out: T[] = []
  for (const item of raw) {
    const parsed = parse(item)
    if (parsed === null) return null
    out.push(parsed)
  }
  return out
}

function isFields(raw: unknown): raw is Fields {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
}

function isNumber(raw: unknown): raw is number {
  return typeof raw === 'number' && Number.isFinite(raw)
}

function bool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback
}
