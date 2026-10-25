import type { KeyValueStore, LoadedGame } from './storage'
import type { Game } from './types'

/** Test support: a memory store in place of `localStorage`. */

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
