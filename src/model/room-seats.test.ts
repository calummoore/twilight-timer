import { describe, expect, it } from 'vitest'
import { newRoom } from './room'
import {
  CODE,
  HOST,
  JAZ,
  KIRA,
  LAPTOP,
  SETUP,
  playStrategyOn,
  seatedServer,
  server,
  tableServer,
} from './test-room'
import { PLAYERS } from './test-table'
import type { Seat } from './types'

/** The table with Wren's seat still without a faction. */
const OPEN: Seat[] = PLAYERS.map((p) =>
  p.id === 'wren' ? { ...p, factionId: null } : p,
)
const WREN = 'wren-token-0000000005'
const wren = { name: 'Wren', colour: 'orange', factionId: null } as const

/** The host created the game with Wren's faction open and joined as the table. */
function openServer() {
  const s = server(newRoom(CODE, { ...SETUP, players: OPEN }, HOST))
  s.send(HOST, { type: 'claim', seat: null })
  return s
}

const seat = (s: ReturnType<typeof server>, id: string) =>
  s.room.setup.players.find((p) => p.id === id)

describe('a claim with the values of the seat', () => {
  it('takes the seat with a name, a colour, and a faction', () => {
    const s = openServer()
    const values = { name: 'Ren', colour: 'pink', factionId: 'argent' } as const
    expect(s.send(WREN, { type: 'claim', seat: 'wren', values })).toBeNull()
    expect(seat(s, 'wren')).toEqual({ id: 'wren', ...values })
    expect(s.room.members.at(-1)).toMatchObject({ seat: 'wren', admin: false })
  })

  it('waits for a faction on the seat before Start game', () => {
    const s = openServer()
    expect(s.send(WREN, { type: 'claim', seat: 'wren' })).toBe('invalid')
    expect(s.send(WREN, { type: 'claim', seat: 'wren', values: wren })).toBe(
      'invalid',
    )
    expect(s.room.members).toHaveLength(1)
  })

  it('lets a device without admin pick only free values', () => {
    const s = openServer()
    const taken = { ...wren, colour: 'blue', factionId: 'argent' } as const
    expect(s.send(WREN, { type: 'claim', seat: 'wren', values: taken })).toBe(
      'invalid',
    )
    const twin = { ...wren, name: 'sam', factionId: 'argent' } as const
    expect(s.send(WREN, { type: 'claim', seat: 'wren', values: twin })).toBe(
      'invalid',
    )
  })

  it('lets the device that created the game take a value', () => {
    const s = server(newRoom(CODE, { ...SETUP, players: OPEN }, HOST))
    const values = { ...wren, colour: 'blue', factionId: 'sol' } as const
    expect(s.send(HOST, { type: 'claim', seat: 'wren', values })).toBeNull()
    expect(seat(s, 'wren')).toMatchObject({ colour: 'blue', factionId: 'sol' })
    expect(seat(s, 'jaz')).toMatchObject({ colour: 'orange', factionId: null })
    expect(s.room.members).toEqual([
      { id: 'd1', token: HOST, seat: 'wren', admin: true },
    ])
    expect(s.room.creator).toBeNull()
  })

  it('changes only the name after Start game', () => {
    const s = seatedServer()
    const tom = { name: 'Tom', colour: 'green', factionId: 'arborec' } as const
    const renamed = { ...tom, name: 'Tommy' }
    expect(
      s.send(LAPTOP, { type: 'claim', seat: 'tom', values: renamed }),
    ).toBeNull()
    expect(seat(s, 'tom')?.name).toBe('Tommy')
    expect(s.room.game?.players.find((p) => p.id === 'tom')?.name).toBe('Tommy')
    const other = { ...tom, colour: 'pink' } as const
    expect(s.send(LAPTOP, { type: 'claim', seat: 'tom', values: other })).toBe(
      'invalid',
    )
  })

  it('does nothing when the device holds the seat with these values', () => {
    const s = seatedServer()
    const jaz = { name: 'Jaz', colour: 'blue', factionId: 'sol' } as const
    expect(s.send(JAZ, { type: 'claim', seat: 'jaz', values: jaz })).toBe(
      'invalid',
    )
    expect(s.send(HOST, { type: 'claim', seat: null })).toBe('invalid')
  })
})

describe('an edit of a seat', () => {
  it('lets an admin device take a colour and a faction for any seat', () => {
    const s = openServer()
    const values = { ...wren, colour: 'red', factionId: 'muaat' } as const
    expect(s.send(HOST, { type: 'edit', playerId: 'wren', values })).toBeNull()
    expect(seat(s, 'wren')).toMatchObject(values)
    // Kira held both: the first free colour, which Wren left, and no faction.
    expect(seat(s, 'kira')).toMatchObject({ colour: 'orange', factionId: null })
  })

  it('lets a seated device edit its own seat to free values only', () => {
    const s = openServer()
    s.send(JAZ, { type: 'claim', seat: 'jaz' })
    const jaz = { name: 'Jazz', colour: 'pink', factionId: 'sol' } as const
    expect(
      s.send(JAZ, { type: 'edit', playerId: 'jaz', values: jaz }),
    ).toBeNull()
    expect(seat(s, 'jaz')).toEqual({ id: 'jaz', ...jaz })
    const taken = { ...jaz, colour: 'red' } as const
    expect(s.send(JAZ, { type: 'edit', playerId: 'jaz', values: taken })).toBe(
      'invalid',
    )
    expect(s.send(JAZ, { type: 'edit', playerId: 'kira', values: jaz })).toBe(
      'forbidden',
    )
    expect(
      s.send(JAZ, {
        type: 'edit',
        playerId: 'jaz',
        values: jaz,
        speaker: true,
      }),
    ).toBe('forbidden')
  })

  it('gives the speaker token with the edit, before Start game', () => {
    const s = openServer()
    const kira = { name: 'Kira', colour: 'red', factionId: 'muaat' } as const
    const edit = { type: 'edit', playerId: 'kira', values: kira } as const
    expect(s.send(HOST, edit)).toBe('invalid')
    expect(s.send(HOST, { ...edit, speaker: true })).toBeNull()
    expect(s.room.setup.speakerId).toBe('kira')
    expect(s.send(HOST, { ...edit, speaker: true })).toBe('invalid')
  })

  it('changes only the name after Start game, on every screen', () => {
    const s = seatedServer()
    playStrategyOn(s)
    const kira = { name: 'Kira', colour: 'red', factionId: 'muaat' } as const
    const renamed = { ...kira, name: 'Kiara' }
    expect(
      s.send(KIRA, { type: 'edit', playerId: 'kira', values: renamed }),
    ).toBeNull()
    expect(seat(s, 'kira')?.name).toBe('Kiara')
    expect(s.view()?.players.find((p) => p.id === 'kira')?.name).toBe('Kiara')
    const moved = { ...kira, factionId: 'sol' } as const
    expect(
      s.send(HOST, { type: 'edit', playerId: 'kira', values: moved }),
    ).toBe('invalid')
    const speaker = { type: 'edit', playerId: 'kira', values: kira } as const
    expect(s.send(HOST, { ...speaker, speaker: true })).toBe('invalid')
  })

  it('leaves a viewer and a device that has not joined out', () => {
    const s = tableServer()
    s.send(LAPTOP, { type: 'claim', seat: null })
    const jaz = { name: 'Jaz', colour: 'blue', factionId: 'sol' } as const
    expect(s.send(LAPTOP, { type: 'edit', playerId: 'jaz', values: jaz })).toBe(
      'forbidden',
    )
    expect(s.send(WREN, { type: 'edit', playerId: 'jaz', values: jaz })).toBe(
      'forbidden',
    )
  })
})

describe('the seat order, the deal, and Start game in the lobby', () => {
  it('moves a seat to the place of another, on an admin device', () => {
    const s = openServer()
    s.send(JAZ, { type: 'claim', seat: 'jaz' })
    const move = { type: 'moveSeat', playerId: 'wren', toId: 'tom' } as const
    expect(s.send(JAZ, move)).toBe('forbidden')
    expect(s.send(HOST, move)).toBeNull()
    expect(s.room.setup.players.map((p) => p.id)).toEqual([
      'jaz',
      'kira',
      'wren',
      'tom',
      'priya',
      'sam',
    ])
    expect(s.room.setup.speakerId).toBe('jaz')
    expect(s.send(HOST, { ...move, toId: 'wren' })).toBe('invalid')
  })

  it('keeps the seat order of a running game', () => {
    const s = seatedServer()
    const move = { type: 'moveSeat', playerId: 'wren', toId: 'tom' } as const
    expect(s.send(HOST, move)).toBe('invalid')
  })

  it('deals a faction to each seat without one, on an admin device', () => {
    const s = openServer()
    s.send(JAZ, { type: 'claim', seat: 'jaz' })
    expect(s.send(JAZ, { type: 'deal' })).toBe('forbidden')
    expect(s.send(HOST, { type: 'deal' })).toBeNull()
    expect(seat(s, 'wren')?.factionId).toBe('argent')
    expect(s.send(HOST, { type: 'deal' })).toBe('invalid')
  })

  it('starts the game only when every seat has a faction', () => {
    const s = openServer()
    expect(s.send(HOST, { type: 'start' })).toBe('invalid')
    expect(s.room.game).toBeNull()
    s.send(HOST, { type: 'deal' })
    expect(s.send(HOST, { type: 'start' })).toBeNull()
    expect(s.room.game?.players.map((p) => p.factionId)).not.toContain(null)
    expect(s.send(HOST, { type: 'deal' })).toBe('invalid')
  })
})
