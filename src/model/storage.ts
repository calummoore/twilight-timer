import { parseSettings } from './parse'
import type { Settings } from './settings'

/** The part of `localStorage` that the app uses. Tests pass a map. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const SETTINGS_KEY = 'ti4tempo.settings.v1'

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
