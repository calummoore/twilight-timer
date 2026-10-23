import { parseGame, parseSettings } from './parse'
import type { Settings } from './settings'
import type { Game } from './types'

/** The part of `localStorage` that the app uses. Tests pass a map. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * The keys of one saved game, newest version first. Load reads the first
 * key with data, so a game saved by an older build still loads.
 */
type Slot = readonly [current: string, ...older: string[]]

const GAME: Slot = ['ti4tempo.game.v2', 'ti4tempo.game.v1']
const LAST_GAME: Slot = ['ti4tempo.lastGame.v2', 'ti4tempo.lastGame.v1']
const SETTINGS_KEY = 'ti4tempo.settings.v1'

export type LoadedGame =
  { status: 'none' } | { status: 'ok'; game: Game } | { status: 'invalid' }

export function loadGame(store: KeyValueStore, slot = GAME): LoadedGame {
  const text = read(store, slot)
  if (text === null) return { status: 'none' }
  const game = parseGame(parseJson(text))
  return game ? { status: 'ok', game } : { status: 'invalid' }
}

export function loadLastGame(store: KeyValueStore): LoadedGame {
  return loadGame(store, LAST_GAME)
}

export function saveGame(store: KeyValueStore, game: Game): void {
  write(store, GAME, JSON.stringify(game))
}

/** Keeps the current game as the last game, then clears it. */
export function archiveGame(store: KeyValueStore): void {
  const text = read(store, GAME)
  if (text !== null) write(store, LAST_GAME, text)
  for (const key of GAME) store.removeItem(key)
}

export function loadSettings(store: KeyValueStore): Settings {
  const text = store.getItem(SETTINGS_KEY)
  return parseSettings(text === null ? null : parseJson(text))
}

export function saveSettings(store: KeyValueStore, settings: Settings): void {
  store.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function read(store: KeyValueStore, slot: Slot): string | null {
  for (const key of slot) {
    const text = store.getItem(key)
    if (text !== null) return text
  }
  return null
}

/** Writes the current key and removes the older ones, so they cannot come back. */
function write(store: KeyValueStore, slot: Slot, text: string): void {
  const [current, ...older] = slot
  store.setItem(current, text)
  for (const key of older) store.removeItem(key)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
