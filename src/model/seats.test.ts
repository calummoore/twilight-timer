import { describe, expect, it } from 'vitest'
import {
  cleanName,
  dealSeats,
  editSeat,
  firstFreeColour,
  moveSeat,
  nameKey,
  sameSeats,
  seatedPlayers,
  sharedName,
} from './seats'
import { DEFAULT_EXPANSIONS } from './settings'
import { PLAYERS } from './test-table'
import type { Seat } from './types'

/** The table with Wren's seat still without a faction. */
const SEATS: Seat[] = PLAYERS.map((p) =>
  p.id === 'wren' ? { ...p, factionId: null } : p,
)
const wren = { name: 'Wren', colour: 'orange', factionId: null } as const

/**
 * The seat rules that every edit keeps: the same seats in the same order,
 * no two seats with one colour, no two seats with one faction, and every
 * seat outside `changed` as it was. Returns the seats after the edit.
 */
function edited(
  before: readonly Seat[],
  after: readonly Seat[] | null,
  changed: readonly string[],
): Seat[] {
  expect(after).not.toBeNull()
  const seats = [...(after ?? [])]
  expect(seats.map((s) => s.id)).toEqual(before.map((s) => s.id))
  const colours = seats.map((s) => s.colour)
  expect(new Set(colours).size).toBe(colours.length)
  const factions = seats.flatMap((s) => s.factionId ?? [])
  expect(new Set(factions).size).toBe(factions.length)
  const kept = (s: Seat) => !changed.includes(s.id)
  expect(seats.filter(kept)).toEqual(before.filter(kept))
  return seats
}

describe('names', () => {
  it('compares names without spaces around them and in one case', () => {
    expect(nameKey('  Sam ')).toBe('sam')
    expect(cleanName('  Sam ')).toBe('Sam')
    expect(cleanName('   ')).toBeNull()
  })

  it('finds the name that two seats share', () => {
    expect(sharedName(SEATS)).toBeNull()
    const twins = SEATS.map((s) =>
      s.id === 'wren' ? { ...s, name: ' SAM' } : s,
    )
    expect(sharedName(twins)).toBe('SAM')
  })
})

describe('an edit of a seat', () => {
  it('takes a name, a free colour, and a free faction', () => {
    const values = {
      name: ' Ren ',
      colour: 'pink',
      factionId: 'argent',
    } as const
    const next = edited(SEATS, editSeat(SEATS, 'wren', values, false), ['wren'])
    expect(next.find((s) => s.id === 'wren')).toEqual({
      id: 'wren',
      name: 'Ren',
      colour: 'pink',
      factionId: 'argent',
    })
  })

  it('refuses an empty name, a taken name, and an unknown seat', () => {
    expect(editSeat(SEATS, 'wren', { ...wren, name: '  ' }, true)).toBeNull()
    expect(editSeat(SEATS, 'wren', { ...wren, name: 'sam ' }, true)).toBeNull()
    expect(editSeat(SEATS, 'zed', wren, true)).toBeNull()
  })

  it('refuses a taken colour or faction to a device that does not take', () => {
    expect(
      editSeat(SEATS, 'wren', { ...wren, colour: 'blue' }, false),
    ).toBeNull()
    expect(
      editSeat(SEATS, 'wren', { ...wren, factionId: 'sol' }, false),
    ).toBeNull()
  })

  it('moves a taken colour and faction to the seat of an admin device', () => {
    const values = { ...wren, colour: 'blue', factionId: 'sol' } as const
    const next = edited(SEATS, editSeat(SEATS, 'wren', values, true), [
      'jaz',
      'wren',
    ])
    expect(next.find((s) => s.id === 'wren')).toMatchObject({
      colour: 'blue',
      factionId: 'sol',
    })
    // Jaz held both: Jaz gets the first free colour, which Wren left, and
    // no faction.
    expect(next.find((s) => s.id === 'jaz')).toMatchObject({
      colour: 'orange',
      factionId: null,
    })
  })

  it('takes a colour from one seat and a faction from another', () => {
    const values = { ...wren, colour: 'blue', factionId: 'muaat' } as const
    const next = edited(SEATS, editSeat(SEATS, 'wren', values, true), [
      'jaz',
      'kira',
      'wren',
    ])
    expect(next.find((s) => s.id === 'wren')).toMatchObject(values)
    // Jaz held the colour, and Kira the faction.
    expect(next.find((s) => s.id === 'jaz')).toMatchObject({
      colour: 'orange',
      factionId: 'sol',
    })
    expect(next.find((s) => s.id === 'kira')).toMatchObject({
      colour: 'red',
      factionId: null,
    })
  })

  it('keeps the own colour and faction of the seat', () => {
    const jaz = { name: 'Jaz', colour: 'blue', factionId: 'sol' } as const
    const next = edited(SEATS, editSeat(SEATS, 'jaz', jaz, false), [])
    expect(next).toEqual(SEATS)
    expect(sameSeats(next, SEATS)).toBe(true)
  })

  it('finds the first free colour', () => {
    expect(firstFreeColour(SEATS)).toBe('pink')
    expect(firstFreeColour(SEATS.slice(1))).toBe('blue')
  })
})

describe('the places of the seats', () => {
  it('moves a seat to the place of another, and shifts the seats between', () => {
    const ids = (seats: readonly Seat[] | null) => seats?.map((s) => s.id)
    expect(ids(moveSeat(SEATS, 'wren', 'tom'))).toEqual([
      'jaz',
      'kira',
      'wren',
      'tom',
      'priya',
      'sam',
    ])
    expect(ids(moveSeat(SEATS, 'jaz', 'priya'))).toEqual([
      'kira',
      'tom',
      'priya',
      'jaz',
      'sam',
      'wren',
    ])
    expect(moveSeat(SEATS, 'jaz', 'jaz')).toBeNull()
    expect(moveSeat(SEATS, 'jaz', 'zed')).toBeNull()
  })
})

describe('the deal and the start', () => {
  it('deals a faction in play to each seat without one', () => {
    // The first choice of the pool, in name order, that no seat holds.
    const dealt = dealSeats(SEATS, DEFAULT_EXPANSIONS, () => 0)
    expect(dealt?.find((s) => s.id === 'wren')?.factionId).toBe('argent')
    expect(dealt?.slice(0, 5)).toEqual(SEATS.slice(0, 5))
    expect(dealSeats(PLAYERS, DEFAULT_EXPANSIONS, () => 0)).toBeNull()
  })

  it('turns the seats into players only when every seat has a faction', () => {
    expect(seatedPlayers(SEATS)).toBeNull()
    expect(seatedPlayers(PLAYERS)).toEqual(PLAYERS)
  })
})
