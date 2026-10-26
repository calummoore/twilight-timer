import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { loadSettings, saveSettings } from './storage'
import { memoryStore } from './test-store'

describe('storage', () => {
  it('falls back to defaults for missing or broken settings', () => {
    const store = memoryStore()
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
    saveSettings(store, {
      ...DEFAULT_SETTINGS,
      enforceLimits: true,
      alarmSound: 'chime',
    })
    expect(loadSettings(store)).toMatchObject({
      enforceLimits: true,
      alarmSound: 'chime',
    })
    store.data.set(
      'ti4tempo.settings.v1',
      JSON.stringify({ alarmSound: 'kazoo', keepAwake: 'yes' }),
    )
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
    store.data.set('ti4tempo.settings.v1', '{not json')
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
  })

  it('loads the expansions as saved, or each broken one as on', () => {
    const store = memoryStore()
    const key = 'ti4tempo.settings.v1'
    // Settings from a build before the expansions turn every expansion on.
    store.data.set(key, JSON.stringify({ enforceLimits: true }))
    expect(loadSettings(store)).toMatchObject({
      enforceLimits: true,
      expansions: { pok: true, te: true, keleres: true },
    })
    const chosen = { pok: true, te: false, keleres: false }
    saveSettings(store, { ...DEFAULT_SETTINGS, expansions: chosen })
    expect(loadSettings(store).expansions).toEqual(chosen)
    store.data.set(key, JSON.stringify({ expansions: 'all' }))
    expect(loadSettings(store).expansions).toEqual(DEFAULT_SETTINGS.expansions)
    // One broken value falls back alone. The other values load as saved.
    store.data.set(
      key,
      JSON.stringify({ expansions: { pok: false, te: 'no' } }),
    )
    expect(loadSettings(store).expansions).toEqual({
      pok: false,
      te: true,
      keleres: true,
    })
  })
})
