import { describe, expect, it } from 'vitest'
import { Room, type RoomConnection, type RoomStore } from './room'
import { parseServerMessage, type ServerMessage } from './room-messages'
import { PROTOCOL, type Change } from './share'
import { NOW, hash, sharedRecord, tap } from './share-test-kit'

interface FakeConnection extends RoomConnection {
  inbox: ServerMessage[]
}

function connection(id: string): FakeConnection {
  let device: string | null = null
  const inbox: ServerMessage[] = []
  return {
    id,
    inbox,
    get device() {
      return device
    },
    setDevice(deviceId) {
      device = deviceId
    },
    send(text) {
      const message = parseServerMessage(text)
      if (!message) throw new Error(`the room sent a bad message: ${text}`)
      inbox.push(message)
    },
  }
}

/** A room with a memory store, as the Durable Object gives it. */
function room(text: string | null = null) {
  const data = { text }
  const store: RoomStore = {
    load: () => data.text,
    save: (t) => void (data.text = t),
  }
  const open: FakeConnection[] = []
  const make = () =>
    new Room({ code: 'ABC234', store, connections: () => open, hash })
  return { room: make(), wake: make, open, data }
}

const hello = (deviceId: string, tableSecret: string | null = null) =>
  JSON.stringify({
    t: 'hello',
    protocol: PROTOCOL,
    deviceId,
    secret: `${deviceId}-secret`,
    tableSecret,
  })

function sharedRoom() {
  const r = room(JSON.stringify(sharedRecord()))
  const ipad = connection('c-ipad')
  const phone = connection('c-phone')
  r.open.push(ipad, phone)
  r.room.message(ipad, hello('ipad'), NOW)
  r.room.message(phone, hello('phone'), NOW)
  return { ...r, ipad, phone }
}

const last = (c: FakeConnection) => c.inbox.at(-1)
const change = (c: Change) => JSON.stringify({ t: 'change', change: c })

describe('the room', () => {
  it('shares a game once, and refuses a code that holds a game', () => {
    const r = room()
    const ipad = connection('c1')
    r.open.push(ipad)
    expect(r.room.check()).toBe('none')
    const game = sharedRecord().game
    const share = {
      t: 'share',
      protocol: PROTOCOL,
      deviceId: 'ipad',
      secret: 's',
      tableSecret: 't',
      gameId: 'g',
      game,
    }
    r.room.message(ipad, JSON.stringify(share), NOW)
    expect(last(ipad)).toMatchObject({
      t: 'view',
      view: { role: 'table', gameId: 'g' },
    })
    expect(r.room.check()).toBe('open')
    const other = connection('c2')
    r.room.message(other, JSON.stringify({ ...share, gameId: 'g2' }), NOW)
    expect(last(other)).toEqual({ t: 'refused', reason: 'taken' })
  })

  it('sends an applied change to every device and an answer to the sender', () => {
    const r = sharedRoom()
    const end = tap(sharedRecord(), { kind: 'turnEnded' })
    r.room.message(r.ipad, change(end), NOW)
    expect(r.phone.inbox.at(-1)).toMatchObject({
      t: 'applied',
      rev: 1,
      change: { tapId: end.tapId },
    })
    expect(r.ipad.inbox.slice(-2).map((m) => m.t)).toEqual([
      'applied',
      'answer',
    ])
    r.room.message(r.ipad, change(end), NOW)
    expect(last(r.ipad)).toMatchObject({
      t: 'answer',
      answer: { ok: true, rev: 1 },
    })
    expect(r.phone.inbox.filter((m) => m.t === 'applied')).toHaveLength(1)
  })

  it('applies one of two taps that two devices send at once', () => {
    const r = sharedRoom()
    const record = sharedRecord()
    r.room.message(r.ipad, change(tap(record, { kind: 'turnEnded' })), NOW)
    r.room.message(r.ipad, change(tap(record, { kind: 'turnEnded' })), NOW)
    const answers = r.ipad.inbox.filter((m) => m.t === 'answer')
    expect(answers.map((m) => m.t === 'answer' && m.answer.ok)).toEqual([
      true,
      false,
    ])
  })

  it('keeps its record when it wakes from sleep', () => {
    const r = sharedRoom()
    r.room.message(
      r.ipad,
      change(tap(sharedRecord(), { kind: 'turnEnded' })),
      NOW,
    )
    const woken = r.wake()
    woken.message(r.phone, hello('phone'), NOW)
    expect(last(r.phone)).toMatchObject({ t: 'view', view: { rev: 1 } })
  })

  it('tells the others about presence when a device joins or leaves', () => {
    const r = sharedRoom()
    const seat: Change = {
      kind: 'claimSeat',
      tapId: 'c-1',
      at: NOW,
      seat: 'kira',
    }
    r.room.message(r.phone, change(seat), NOW)
    expect(last(r.ipad)).toMatchObject({ t: 'view' })
    r.room.closed(r.phone, NOW)
    expect(last(r.ipad)).toMatchObject({ t: 'seats' })
    const kira = (m: ServerMessage | undefined) =>
      m?.t === 'seats' ? m.seats.find((s) => s.seat === 'kira') : undefined
    expect(kira(last(r.ipad))).toMatchObject({ held: true, online: false })
  })

  it('refuses an unknown code, a wrong secret, and a broken record', () => {
    const empty = room()
    const c = connection('c')
    empty.room.message(c, hello('phone'), NOW)
    expect(last(c)).toEqual({ t: 'refused', reason: 'none' })
    const r = sharedRoom()
    const thief = connection('c-thief')
    r.room.message(
      thief,
      JSON.stringify({
        t: 'hello',
        protocol: PROTOCOL,
        deviceId: 'ipad',
        secret: 'guess',
        tableSecret: null,
      }),
      NOW,
    )
    expect(last(thief)).toEqual({ t: 'refused', reason: 'denied' })
    const broken = room('{"version":1}')
    broken.room.message(c, hello('phone'), NOW)
    expect(last(c)).toEqual({ t: 'refused', reason: 'broken' })
    expect(broken.room.check()).toBe('broken')
  })

  it('asks an older page to reload and answers a ping with its clock', () => {
    const r = sharedRoom()
    const old = connection('c-old')
    r.room.message(
      old,
      JSON.stringify({
        t: 'hello',
        protocol: PROTOCOL - 1,
        deviceId: 'x',
        secret: 'y',
        tableSecret: null,
      }),
      NOW,
    )
    expect(last(old)).toEqual({ t: 'reload', protocol: PROTOCOL })
    r.room.message(old, JSON.stringify({ t: 'ping', c: 42 }), NOW)
    expect(last(old)).toEqual({ t: 'pong', c: 42, s: NOW })
  })
})
