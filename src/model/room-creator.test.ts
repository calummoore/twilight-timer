import { describe, expect, it } from 'vitest'
import { newRoom, stateMessage } from './room'
import { CODE, HOST, JAZ, KIRA, LAPTOP, SETUP, server } from './test-room'
import { T0 } from './test-table'

/**
 * The device that creates a game joins it on the claim screen, in a seat or
 * at the table, and gets admin either way.
 */

describe('the device that creates a game', () => {
  it('is not in the game until it joins, so nobody can start it', () => {
    const s = server()
    expect(s.room).toMatchObject({ revision: 0, game: null, members: [] })
    expect(s.send(HOST, { type: 'start' })).toBe('forbidden')
    expect(s.send(HOST, { type: 'admin', deviceId: 'd1', admin: true })).toBe(
      'forbidden',
    )
  })

  it('joins with admin when it takes a seat', () => {
    const s = server()
    expect(s.send(HOST, { type: 'claim', seat: 'kira' })).toBeNull()
    expect(s.room.members).toEqual([
      { id: 'd1', token: HOST, seat: 'kira', admin: true },
    ])
    expect(s.room.creator).toBeNull()
    expect(s.send(HOST, { type: 'start' })).toBeNull()
  })

  it('joins with admin when it joins as a table device', () => {
    const s = server()
    expect(s.send(HOST, { type: 'claim', seat: null })).toBeNull()
    expect(s.room.members).toEqual([
      { id: 'd1', token: HOST, seat: null, admin: true },
    ])
  })

  it('stays an admin when it changes its seat later', () => {
    const s = server()
    s.send(HOST, { type: 'claim', seat: 'kira' })
    expect(s.send(HOST, { type: 'claim', seat: null })).toBeNull()
    expect(s.room.members).toEqual([
      { id: 'd1', token: HOST, seat: null, admin: true },
    ])
  })

  it('gets admin also when other devices joined first, and they get none', () => {
    const s = server()
    s.send(LAPTOP, { type: 'claim', seat: null })
    s.send(JAZ, { type: 'claim', seat: 'jaz' })
    expect(s.send(LAPTOP, { type: 'start' })).toBe('forbidden')
    s.send(HOST, { type: 'claim', seat: 'kira' })
    expect(s.room.members.map((m) => [m.id, m.seat, m.admin])).toEqual([
      ['d1', null, false],
      ['d2', 'jaz', false],
      ['d3', 'kira', true],
    ])
  })

  it('lets a host create the game on a phone, then give admin to the iPad', () => {
    // Kira sets the game up on Kira's phone and takes Kira's seat.
    const s = server(newRoom(CODE, SETUP, KIRA))
    s.send(KIRA, { type: 'claim', seat: 'kira' })
    // The iPad in the middle of the table joins later, as a viewer.
    s.send(HOST, { type: 'claim', seat: null })
    expect(s.room.members[1]).toMatchObject({ seat: null, admin: false })
    expect(s.send(HOST, { type: 'start' })).toBe('forbidden')
    expect(
      s.send(KIRA, { type: 'admin', deviceId: 'd2', admin: true }),
    ).toBeNull()
    expect(s.send(HOST, { type: 'start' })).toBeNull()
  })

  it('learns from its state that it joins with admin, until it joins', () => {
    const s = server()
    const none = new Set<string>()
    expect(stateMessage(s.room, none, HOST, T0)).toMatchObject({
      you: null,
      creator: true,
    })
    for (const token of [JAZ, null]) {
      expect(stateMessage(s.room, none, token, T0)).toMatchObject({
        you: null,
        creator: false,
      })
    }
    s.send(HOST, { type: 'claim', seat: null })
    expect(stateMessage(s.room, none, HOST, T0)).toMatchObject({
      you: 'd1',
      creator: false,
    })
  })
})
