import { describe, expect, it } from 'vitest'
import { derive } from './derive'
import { foldGame } from './fold'
import { readGame } from './migrate'
import { archiveGame, loadGame, loadLastGame, saveGame } from './storage'
import type { Game } from './types'
import { V1_ENTRIES, V1_GAME, V1_NOW, V1_VIEW } from './v1-fixture'

function migrated(): Game {
  const game = readGame(V1_GAME)
  if (!game) throw new Error('the version 1 game did not migrate')
  return game
}

function memoryStore() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('version 1 to version 2', () => {
  it('derives every entry and clock that version 1 derived', () => {
    const view = derive(migrated(), V1_NOW)
    const entries = view.entries.map((e) => [
      e.kind,
      e.phase,
      e.round,
      e.agenda,
      e.playerId,
      e.startMs,
      e.durationMs,
      e.limitMs,
      e.overtimeMs,
      e.card,
      e.running,
    ])
    expect(entries).toEqual(V1_ENTRIES)
    const { phase, ...rest } = V1_VIEW
    expect(view).toMatchObject({ ...rest, view: { phase } })
  })

  it('names a clock and a unique tap id for each action, and keeps them all', () => {
    const game = migrated()
    expect(game).toMatchObject({ version: 2, timeBase: 'device' })
    expect(foldGame(game).rejected).toEqual([])
    const ids = new Set(game.actions.map((a) => a.id))
    expect(ids.size).toBe(game.actions.length)
    for (const a of game.actions) {
      if ('clock' in a) expect(a.clock).toMatch(/^r\d+:/)
    }
    expect(game.actions.filter((a) => a.kind === 'statusStepSet')).toEqual([
      expect.objectContaining({ step: 0, done: true }),
      expect.objectContaining({ step: 1, done: true }),
      expect.objectContaining({ step: 1, done: false }),
      expect.objectContaining({ step: 2, done: true }),
    ])
  })

  it('reads a version 2 game back as it was saved', () => {
    const game = migrated()
    expect(readGame(JSON.parse(JSON.stringify(game)))).toEqual(game)
  })

  it('rejects an unknown version and a broken version 1 game', () => {
    expect(readGame({ ...(V1_GAME as object), version: 3 })).toBeNull()
    const broken = { ...(V1_GAME as object), actions: [{ kind: 'x', at: 1 }] }
    expect(readGame(broken)).toBeNull()
  })
})

describe('stored games from version 1', () => {
  it('loads the current game and the last game from their version 1 keys', () => {
    const store = memoryStore()
    store.setItem('ti4tempo.game.v1', JSON.stringify(V1_GAME))
    store.setItem('ti4tempo.lastGame.v1', JSON.stringify(V1_GAME))
    expect(loadGame(store)).toEqual({ status: 'ok', game: migrated() })
    expect(loadLastGame(store)).toEqual({ status: 'ok', game: migrated() })
  })

  it('saves under the version 2 key and archives both copies', () => {
    const store = memoryStore()
    store.setItem('ti4tempo.game.v1', JSON.stringify(V1_GAME))
    const loaded = loadGame(store)
    if (loaded.status !== 'ok') throw new Error('not loaded')
    saveGame(store, loaded.game)
    expect(store.data.has('ti4tempo.game.v2')).toBe(true)
    archiveGame(store)
    expect(loadGame(store)).toEqual({ status: 'none' })
    expect(store.data.has('ti4tempo.game.v1')).toBe(false)
    expect(loadLastGame(store)).toEqual({ status: 'ok', game: migrated() })
  })

  it('reports a version 1 game that does not parse', () => {
    const store = memoryStore()
    store.setItem('ti4tempo.game.v1', '{"version":1}')
    expect(loadGame(store)).toEqual({ status: 'invalid' })
  })
})
