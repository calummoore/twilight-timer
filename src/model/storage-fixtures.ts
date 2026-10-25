import { factionName } from './factions'
import type { KeyValueStore, LoadedGame } from './storage'
import type { Game } from './types'

/** Test support: a store in memory, and the shapes that older builds saved. */

export function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

export function gameOf(loaded: LoadedGame): Game {
  if (loaded.status !== 'ok') throw new Error(`no game: ${loaded.status}`)
  return loaded.game
}

/** Pauses as the builds before pause reasons saved them: no reason ranges. */
function plainPauses(game: Game) {
  return game.pauses.map(({ from, to }) => ({ from, to }))
}

/** The shape that builds before the Naalu token saved: typed factions. */
export function asVersion1(game: Game) {
  return {
    version: 1,
    startedAt: game.startedAt,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      colour: p.colour,
      faction: factionName(p.factionId),
    })),
    firstSpeakerId: game.firstSpeakerId,
    actions: game.actions,
    pauses: plainPauses(game),
    voids: game.voids,
    limitsLog: game.limitsLog,
  }
}

/** The shape that builds before the window rule saved: no window rule. */
export function asVersion2(game: Game) {
  return {
    version: 2,
    startedAt: game.startedAt,
    players: game.players,
    firstSpeakerId: game.firstSpeakerId,
    naaluTokenOwnerId: game.naaluTokenOwnerId,
    actions: game.actions,
    pauses: plainPauses(game),
    voids: game.voids,
    limitsLog: game.limitsLog,
  }
}

/** Version 3 has the version 2 shape. Its log can remove a player. */
export function asVersion3(game: Game) {
  return { ...asVersion2(game), version: 3 }
}

/** Version 4 from main adds the window rule. Its pauses have no reasons. */
export function asVersion4(game: Game) {
  return {
    ...asVersion2(game),
    version: 4,
    windowEndsTurn: game.windowEndsTurn,
  }
}

/**
 * Version 4 as the pause-reasons branch saved it, before main took that
 * version: rule checks in the pauses, and no window rule.
 */
export function asBranchVersion4(game: Game) {
  return { ...asVersion2(game), version: 4, pauses: game.pauses }
}
