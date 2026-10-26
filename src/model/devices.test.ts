import { describe, expect, it } from 'vitest'
import {
  adminsAway,
  isLastAdmin,
  parseMember,
  publicDevice,
  setAdmin,
  takeSeat,
  type Member,
} from './devices'

const HOST = 'host-token-0000000001'
const JAZ = 'jaz-token-00000000002'
const KIRA = 'kira-token-0000000003'

/** The host's iPad, which created the game, then Jaz's phone in Jaz's seat. */
function twoDevices(): Member[] {
  return takeSeat(takeSeat([], HOST, null, true), JAZ, 'jaz')
}

describe('devices', () => {
  it('lets the device that created the game join with admin, in a seat or at the table', () => {
    expect(takeSeat([], HOST, 'kira', true)).toEqual([
      { id: 'd1', token: HOST, seat: 'kira', admin: true },
    ])
    expect(takeSeat([], HOST, null, true)).toEqual([
      { id: 'd1', token: HOST, seat: null, admin: true },
    ])
  })

  it('keeps the admin of a device that has joined when it changes its seat', () => {
    const moved = takeSeat(twoDevices(), JAZ, 'kira', true)
    expect(moved[1]).toMatchObject({ id: 'd2', seat: 'kira', admin: false })
  })

  it('lets a new device join a seat or the table without admin', () => {
    const seated = twoDevices()
    expect(seated[1]).toEqual({
      id: 'd2',
      token: JAZ,
      seat: 'jaz',
      admin: false,
    })
    const viewer = takeSeat(seated, KIRA, null)
    expect(viewer[2]).toEqual({
      id: 'd3',
      token: KIRA,
      seat: null,
      admin: false,
    })
  })

  it('moves a seat to the device that takes it, and keeps the admin of each', () => {
    const before = setAdmin(twoDevices(), 'd2', true) ?? []
    const after = takeSeat(before, KIRA, 'jaz')
    expect(after.map((m) => [m.id, m.seat, m.admin])).toEqual([
      ['d1', null, true],
      ['d2', null, true],
      ['d3', 'jaz', false],
    ])
  })

  it('changes the seat of a device that has joined, or makes it a table device', () => {
    const moved = takeSeat(twoDevices(), JAZ, 'kira')
    expect(moved[1]).toMatchObject({ id: 'd2', seat: 'kira' })
    const table = takeSeat(moved, JAZ, null)
    expect(table[1]).toMatchObject({ id: 'd2', seat: null, admin: false })
    expect(table).toHaveLength(2)
  })

  it('gives and takes admin, but never from the last admin', () => {
    const given = setAdmin(twoDevices(), 'd2', true)
    expect(given?.map((m) => m.admin)).toEqual([true, true])
    const taken = setAdmin(given ?? [], 'd1', false)
    expect(taken?.map((m) => m.admin)).toEqual([false, true])
    expect(setAdmin(taken ?? [], 'd2', false)).toBeNull()
  })

  it('refuses an admin change that changes nothing or names no device', () => {
    expect(setAdmin(twoDevices(), 'd1', true)).toBeNull()
    expect(setAdmin(twoDevices(), 'd9', true)).toBeNull()
  })

  it('knows the last admin', () => {
    const devices = twoDevices()
    const [host, jaz] = devices
    expect(host && isLastAdmin(devices, host)).toBe(true)
    expect(jaz && isLastAdmin(devices, jaz)).toBe(false)
    const both = setAdmin(devices, 'd2', true) ?? []
    expect(both.some((d) => isLastAdmin(both, d))).toBe(false)
  })

  it('shows a device to the others without its token', () => {
    const [, jaz] = twoDevices()
    expect(jaz && publicDevice(jaz)).toEqual({
      id: 'd2',
      seat: 'jaz',
      admin: false,
    })
  })

  it('reads a stored device and rejects a broken one', () => {
    const [host] = twoDevices()
    expect(parseMember(JSON.parse(JSON.stringify(host)))).toEqual(host)
    expect(parseMember({ ...host, token: 'short' })).toBeNull()
    expect(parseMember({ ...host, id: 'x1' })).toBeNull()
    expect(parseMember({ ...host, seat: 3 })).toBeNull()
    expect(parseMember({ ...host, admin: 'yes' })).toBeNull()
  })
})

describe('admins away', () => {
  it('holds only while no admin device has a connection', () => {
    const host = { admin: true, connected: true }
    const jaz = { admin: false, connected: true }
    expect(adminsAway([host, jaz])).toBe(false)
    expect(adminsAway([{ ...host, connected: false }, jaz])).toBe(true)
    expect(adminsAway([])).toBe(true)
  })
})
