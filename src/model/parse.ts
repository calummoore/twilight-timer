import { EXPANSIONS, FACTIONS, type FactionId } from './factions'
import {
  bool,
  isFields,
  isNumber,
  listOf,
  mapList,
  type Fields,
} from './parse-fields'
import {
  parseAction,
  parseInterval,
  parseLimits,
  parseLimitsChange,
  parsePause,
  parsePlayer,
} from './parse-parts'
import {
  ALARM_SOUNDS,
  DEFAULT_SETTINGS,
  type Expansions,
  type Settings,
} from './settings'
import type { Game } from './types'

/**
 * Narrows stored data to a game, or returns null when it is not valid. A game
 * of an older version gets the shape of the newest first, and one parser reads
 * every game. So a game that loads once loads again after the app saves it.
 */
export function parseGame(raw: unknown): Game | null {
  const game = isFields(raw) ? upgrade(raw) : null
  if (game?.version !== 6) return null
  const players = listOf(game.players, parsePlayer)
  const actions = listOf(game.actions, parseAction)
  const pauses = listOf(game.pauses, parsePause)
  const voids = listOf(game.voids, parseInterval)
  const limitsLog = listOf(game.limitsLog, parseLimitsChange)
  const { startedAt, firstSpeakerId, windowEndsTurn } = game
  if (!players || !actions || !pauses || !voids || !limitsLog) return null
  if (!isNumber(startedAt) || typeof firstSpeakerId !== 'string') return null
  if (typeof windowEndsTurn !== 'boolean') return null
  const isPlayer = (id: unknown) => players.some((p) => p.id === id)
  if (!isPlayer(firstSpeakerId)) return null
  const owner = game.naaluTokenOwnerId
  if (owner !== null && (typeof owner !== 'string' || !isPlayer(owner))) {
    return null
  }
  return {
    version: 6,
    startedAt,
    players,
    firstSpeakerId,
    naaluTokenOwnerId: owner,
    windowEndsTurn,
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
    expansions: parseExpansions(raw.expansions),
  }
}

/** Each expansion that is missing or broken falls back to its default alone. */
function parseExpansions(raw: unknown): Expansions {
  const fields: Fields = isFields(raw) ? raw : {}
  const out = { ...DEFAULT_SETTINGS.expansions }
  for (const { id } of EXPANSIONS) out[id] = bool(fields[id], out[id])
  return out
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
    case 3: {
      // Builds before a window close ended the turn resumed the turn. A
      // version 3 game from a preview of that change stores the rule.
      const stored = raw.windowEndsTurn
      const windowEndsTurn = typeof stored === 'boolean' ? stored : false
      return upgrade({ ...raw, version: 4, windowEndsTurn })
    }
    case 4:
      // Two previews saved version 4 with no window rule, before the window
      // rule took version 4: two cards each, with cards, and pause reasons,
      // with rule checks. Both resumed the turn.
      if (raw.windowEndsTurn === undefined) {
        return upgrade({ ...raw, version: 5, windowEndsTurn: false })
      }
      // Builds that gave each player one card logged no card.
      return upgrade({
        ...raw,
        version: 5,
        actions: mapList(raw.actions, cardless),
      })
    case 5:
      // A preview of pause reasons saved version 5 with rule checks and no
      // card, before two cards each took version 5. Main's version 5 logs the
      // card, so only a missing card becomes null.
      return { ...raw, version: 6, actions: mapList(raw.actions, missingCard) }
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

/** A strategic action without a card gets a null card. Another keeps its card. */
function missingCard(raw: unknown): unknown {
  if (!isFields(raw) || raw.card !== undefined) return raw
  return cardless(raw)
}

/** A typed faction name or id from the list, in any letter case, or null. */
function factionFromText(text: string): FactionId | null {
  const key = text.trim().toLowerCase()
  const match = FACTIONS.find(
    (f) => f.id === key || f.name.toLowerCase() === key,
  )
  return match?.id ?? null
}
