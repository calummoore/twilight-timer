import { parseGame, parseSettings } from './parse'
import type { Settings } from './settings'
import type { Game } from './types'

/** The part of `localStorage` that the app uses. Tests pass a map. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const GAME_KEY = 'ti4tempo.game.v1'
const LAST_GAME_KEY = 'ti4tempo.lastGame.v1'
const SETTINGS_KEY = 'ti4tempo.settings.v1'

export type LoadedGame =
  { status: 'none' } | { status: 'ok'; game: Game } | { status: 'invalid' }

export function loadGame(store: KeyValueStore, key = GAME_KEY): LoadedGame {
  const text = store.getItem(key)
  if (text === null) return { status: 'none' }
  const game = parseGame(parseJson(text))
  return game ? { status: 'ok', game } : { status: 'invalid' }
}

export function loadLastGame(store: KeyValueStore): LoadedGame {
  return loadGame(store, LAST_GAME_KEY)
}

export function saveGame(store: KeyValueStore, game: Game): void {
  store.setItem(GAME_KEY, JSON.stringify(game))
}

/** Keeps the current game as the last game, then clears it. */
export function archiveGame(store: KeyValueStore): void {
  const text = store.getItem(GAME_KEY)
  if (text !== null) store.setItem(LAST_GAME_KEY, text)
  store.removeItem(GAME_KEY)
}

export function loadSettings(store: KeyValueStore): Settings {
  const text = store.getItem(SETTINGS_KEY)
  return parseSettings(text === null ? null : parseJson(text))
}

export function saveSettings(store: KeyValueStore, settings: Settings): void {
  store.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
