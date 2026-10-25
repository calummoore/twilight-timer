import { factionName } from './factions'
import type { Game } from './types'

/** Test support: the shapes in which older builds saved a game. */

/** Pauses as the builds before pause reasons saved them: no reason ranges. */
function plainPauses(game: Game) {
  return game.pauses.map(({ from, to }) => ({ from, to }))
}

/** Main's builds before version 5 gave each player one card and logged no card. */
export function cardlessLog(game: Game) {
  return game.actions.map((a) =>
    a.kind === 'strategyCardPlayed' ? { kind: a.kind, at: a.at } : a,
  )
}

/** The game that an older save loads as: each strategic action has no card. */
export function withNullCards(game: Game): Game {
  const actions = game.actions.map((a) =>
    a.kind === 'strategyCardPlayed' ? { ...a, card: null } : a,
  )
  return { ...game, actions }
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
    actions: cardlessLog(game),
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
    actions: cardlessLog(game),
    pauses: plainPauses(game),
    voids: game.voids,
    limitsLog: game.limitsLog,
  }
}

/** Version 3 has the version 2 shape. Its log can remove a player. */
export function asVersion3(game: Game) {
  return { ...asVersion2(game), version: 3 }
}

/** Main's version 4 stores the window rule, but no card for a strategic action. */
export function asVersion4(game: Game) {
  return {
    ...game,
    version: 4,
    actions: cardlessLog(game),
    pauses: plainPauses(game),
  }
}

/** Main's version 5 logs the card of each strategic action. */
export function asVersion5(game: Game) {
  return { ...game, version: 5, pauses: plainPauses(game) }
}

/**
 * A preview of pause reasons saved version 4 before the window rule took
 * that version: rule checks, no window rule, and no card.
 */
export function asPreviewVersion4(game: Game) {
  return { ...asVersion2(game), version: 4, pauses: game.pauses }
}

/**
 * A preview of pause reasons saved version 5 before two cards each took
 * that version: rule checks and the window rule, but no card.
 */
export function asPreviewVersion5(game: Game) {
  return { ...game, version: 5, actions: cardlessLog(game) }
}
