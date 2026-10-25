import { readGame } from './migrate'
import { parseSettings } from './parse'
import type { Settings } from './settings'
import type { Game } from './types'

/** The part of `localStorage` that the app uses. Tests pass a map. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** The current key first, then the keys of older versions to migrate. */
const GAME_KEYS = ['ti4tempo.game.v2', 'ti4tempo.game.v1'] as const
const LAST_GAME_KEYS = ['ti4tempo.lastGame.v2', 'ti4tempo.lastGame.v1'] as const
const SETTINGS_KEY = 'ti4tempo.settings.v1'

export type LoadedGame =
  { status: 'none' } | { status: 'ok'; game: Game } | { status: 'invalid' }

/**
 * Loads the newest stored copy of a game. A game under an older key passes
 * the version steps. The caller saves it under the current key.
 */
export function loadGame(
  store: KeyValueStore,
  keys: readonly string[] = GAME_KEYS,
): LoadedGame {
  for (const key of keys) {
    const text = store.getItem(key)
    if (text === null) continue
    const game = readGame(parseJson(text))
    return game ? { status: 'ok', game } : { status: 'invalid' }
  }
  return { status: 'none' }
}

export function loadLastGame(store: KeyValueStore): LoadedGame {
  return loadGame(store, LAST_GAME_KEYS)
}

export function saveGame(store: KeyValueStore, game: Game): void {
  store.setItem(GAME_KEYS[0], JSON.stringify(game))
}

/**
 * Keeps the current game as the last game, then clears it. An older copy
 * goes too, so that it cannot come back as the current game.
 */
export function archiveGame(store: KeyValueStore): void {
  const loaded = loadGame(store)
  if (loaded.status === 'ok') {
    store.setItem(LAST_GAME_KEYS[0], JSON.stringify(loaded.game))
  }
  for (const key of GAME_KEYS) store.removeItem(key)
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
