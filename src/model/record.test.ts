import { describe, expect, it } from 'vitest'
import { admit, applyChange, viewFor } from './record'
import type { Change, SharedRecord } from './share'
import { NOW, hash, nextTapId, sharedRecord, tap } from './share-test-kit'

function withPlayer(record: SharedRecord, device: string, seat?: string) {
  let r = admit(record, device, hash(`${device}-secret`), null)
  if (!r) throw new Error('not admitted')
  if (seat) {
    const claim: Change = {
      kind: 'claimSeat',
      tapId: nextTapId(),
      at: NOW,
      seat,
    }
    r = applyChange(r, device, claim, NOW).record
  }
  return r
}

describe('roles', () => {
  it('lets a player device act for its own seat only', () => {
    const record = withPlayer(sharedRecord(), 'phone', 'tom')
    const end = tap(record, { kind: 'turnEnded' })
    const other = withPlayer(record, 'phone-2', 'wren')
    expect(applyChange(other, 'phone-2', end, NOW).answer).toEqual({
      ok: false,
      reason: 'role',
    })
    expect(applyChange(other, 'phone', end, NOW).answer).toMatchObject({
      ok: true,
    })
  })

  it('keeps table actions in table mode', () => {
    const record = withPlayer(sharedRecord(), 'phone', 'tom')
    const pause: Change = { kind: 'pause', tapId: nextTapId(), at: NOW }
    expect(applyChange(record, 'phone', pause, NOW).answer).toEqual({
      ok: false,
      reason: 'role',
    })
    expect(applyChange(record, 'ipad', pause, NOW).answer.ok).toBe(true)
  })

  it('gives table mode to the table secret and refuses a wrong secret', () => {
    const record = sharedRecord()
    const laptop = admit(record, 'laptop', hash('x'), hash('table-secret'))
    expect(laptop?.devices.laptop?.role).toBe('table')
    expect(admit(record, 'ipad', hash('wrong'), null)).toBeNull()
    const phone = admit(record, 'phone', hash('p'), hash('guess'))
    expect(phone?.devices.phone?.role).toBe('player')
  })
})

describe('changes', () => {
  it('answers a repeated tap id with its first answer', () => {
    const record = sharedRecord()
    const end = tap(record, { kind: 'turnEnded' })
    const first = applyChange(record, 'ipad', end, NOW)
    const again = applyChange(first.record, 'ipad', end, NOW + 1)
    expect(again.answer).toEqual(first.answer)
    expect(again.applied).toBeNull()
    expect(again.record).toBe(first.record)
  })

  it('applies one of two taps from the same state', () => {
    const record = sharedRecord()
    const a = tap(record, { kind: 'turnEnded' })
    const b = tap(record, { kind: 'turnEnded' })
    const first = applyChange(record, 'ipad', a, NOW)
    const second = applyChange(first.record, 'ipad', b, NOW)
    expect(first.answer.ok).toBe(true)
    expect(second.answer).toEqual({ ok: false, reason: 'stale' })
    expect(second.record.rev).toBe(first.record.rev)
  })

  it('keeps each time between the newest time in the game and the server clock', () => {
    const record = sharedRecord()
    const newest = record.game.actions.at(-1)?.at ?? 0
    const early = tap(record, { kind: 'turnEnded' }, newest - 99_000)
    const r1 = applyChange(record, 'ipad', early, NOW)
    expect(r1.applied?.at).toBe(newest)
    const late = tap(r1.record, { kind: 'turnEnded' }, NOW + 99_000)
    expect(applyChange(r1.record, 'ipad', late, NOW).applied?.at).toBe(NOW)
  })

  it('refuses every change after the table stops sharing', () => {
    const record = sharedRecord()
    const stop: Change = { kind: 'stopSharing', tapId: nextTapId(), at: NOW }
    const closed = applyChange(record, 'ipad', stop, NOW).record
    expect(closed.closed).toBe(true)
    const end = tap(closed, { kind: 'turnEnded' })
    expect(applyChange(closed, 'ipad', end, NOW).answer).toEqual({
      ok: false,
      reason: 'closed',
    })
  })
})

describe('seats', () => {
  const seat = (
    kind: 'claimSeat' | 'requestMove' | 'approveMove' | 'releaseSeat',
    s: string,
  ): Change => ({
    kind,
    tapId: nextTapId(),
    at: NOW,
    seat: s,
  })

  it('moves a held seat only when a table device approves', () => {
    let r = withPlayer(sharedRecord(), 'old-phone', 'kira')
    r = withPlayer(r, 'new-phone')
    expect(
      applyChange(r, 'new-phone', seat('claimSeat', 'kira'), NOW).answer,
    ).toEqual({ ok: false, reason: 'held' })
    r = applyChange(r, 'new-phone', seat('requestMove', 'kira'), NOW).record
    expect(r.seats.kira).toBe('old-phone')
    expect(
      viewFor(r, 'ipad', new Set())?.seats.find((s) => s.seat === 'kira'),
    ).toMatchObject({ held: true, request: 'other' })
    expect(
      applyChange(r, 'new-phone', seat('approveMove', 'kira'), NOW).answer.ok,
    ).toBe(false)
    r = applyChange(r, 'ipad', seat('approveMove', 'kira'), NOW).record
    expect(r.seats.kira).toBe('new-phone')
    expect(r.devices['old-phone']?.seat).toBeNull()
    expect(r.moves).toEqual({})
  })

  it('holds one seat per device and frees a released seat', () => {
    let r = withPlayer(sharedRecord(), 'phone', 'kira')
    r = applyChange(r, 'phone', seat('claimSeat', 'tom'), NOW).record
    expect(r.seats).toEqual({ tom: 'phone' })
    r = applyChange(r, 'ipad', seat('releaseSeat', 'tom'), NOW).record
    expect(r.seats).toEqual({})
    expect(r.devices.phone?.seat).toBeNull()
  })
})

describe('views', () => {
  it('shows private data only to the devices of its seat', () => {
    let r = withPlayer(sharedRecord(), 'phone', 'kira')
    r = withPlayer(r, 'laptop')
    expect(viewFor(r, 'ipad', new Set())?.private).toBeNull()
    expect(viewFor(r, 'phone', new Set())?.private).toEqual({})
    expect(viewFor(r, 'laptop', new Set())?.private).toBeNull()
    expect(viewFor(r, 'stranger', new Set())).toBeNull()
  })

  it('holds no device secret and no table secret in any view', () => {
    const r = withPlayer(sharedRecord(), 'phone', 'kira')
    for (const device of ['ipad', 'phone']) {
      const text = JSON.stringify(viewFor(r, device, new Set(['phone'])))
      expect(text).not.toContain('hash:')
      expect(text).not.toContain('secret')
    }
  })

  it('marks seats as held, yours, and online', () => {
    const r = withPlayer(sharedRecord(), 'phone', 'kira')
    const kira = viewFor(r, 'phone', new Set(['phone']))?.seats.find(
      (s) => s.seat === 'kira',
    )
    expect(kira).toEqual({
      seat: 'kira',
      held: true,
      yours: true,
      online: true,
      request: 'none',
    })
  })
})
