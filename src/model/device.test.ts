import { describe, expect, it } from 'vitest'
import { derive } from './derive'
import {
  clockSample,
  newSession,
  onAnswer,
  onApplied,
  onView,
  parseDeviceRecord,
  queue,
  shownGame,
  type Session,
} from './device'
import { viewFor } from './record'
import type { GameChange } from './share'
import { NOW, sharedRecord, tap } from './share-test-kit'

function joined(): Session {
  const record = sharedRecord()
  const view = viewFor(record, 'ipad', new Set(['ipad']))
  if (!view) throw new Error('no view')
  return onView(newSession('ABC234', 0), view)
}

describe('the device session', () => {
  it('shows a pending tap at once and keeps it until the server answers', () => {
    const s = joined()
    const end = tap(sharedRecord(), { kind: 'turnEnded' })
    const waiting = queue(s, end)
    const shown = shownGame(waiting)
    if (!shown) throw new Error('nothing shown')
    expect(derive(shown, NOW).view).toMatchObject({ activeId: 'wren' })
    expect(waiting.confirmed).toBe(s.confirmed)
    const applied = onApplied(waiting, s.rev + 1, end)
    expect(applied?.pending).toEqual([])
    expect(applied?.rev).toBe(s.rev + 1)
  })

  it('asks for a full view when a change is missing in between', () => {
    const s = joined()
    const end: GameChange = tap(sharedRecord(), { kind: 'turnEnded' })
    expect(onApplied(s, s.rev + 2, end)).toBeNull()
  })

  it('reports a refused tap and drops it', () => {
    const s = queue(joined(), tap(sharedRecord(), { kind: 'turnEnded' }))
    const tapId = s.pending[0]?.tapId ?? ''
    const result = onAnswer(s, tapId, { ok: false, reason: 'stale' })
    expect(result.refused).toBe('stale')
    expect(result.session.pending).toEqual([])
    expect(
      onAnswer(result.session, tapId, { ok: false, reason: 'stale' }).refused,
    ).toBeNull()
  })

  it('ends the session when another game holds the code', () => {
    const s = queue(joined(), tap(sharedRecord(), { kind: 'turnEnded' }))
    const record = { ...sharedRecord(), gameId: 'another' }
    const view = viewFor(record, 'ipad', new Set())
    if (!view) throw new Error('no view')
    expect(onView(s, view)).toMatchObject({ closed: true, pending: [] })
  })

  it('estimates the clock offset from the middle of the round trip', () => {
    expect(clockSample(1000, 6100, 1200)).toEqual({ rtt: 200, offset: 5000 })
  })

  it('reads its stored record back, and refuses a broken one', () => {
    const s = queue(joined(), tap(sharedRecord(), { kind: 'turnEnded' }))
    const record = { version: 1, deviceId: 'd', secret: 's', session: s }
    expect(parseDeviceRecord(JSON.parse(JSON.stringify(record)))).toEqual(
      record,
    )
    expect(parseDeviceRecord({ ...record, session: { code: 1 } })).toBeNull()
    expect(
      parseDeviceRecord({
        version: 1,
        deviceId: 'd',
        secret: 's',
        session: null,
      }),
    ).toMatchObject({ session: null })
  })
})
