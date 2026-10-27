import { dealFactions, type Random } from './deal'
import { moveItem } from './list-move'
import { COLOURS, type Colour } from './rules'
import type { Expansions } from './settings'
import type { Player, Seat, SeatValues } from './types'

/**
 * The rules of the seats: names, colours, factions, and places. The claim
 * screen, the edit dialog, Setup, and the server apply them.
 */

/** The key under which two names are the same: trimmed, in one case. */
export function nameKey(name: string): string {
  return name.trim().toLocaleLowerCase()
}

/** The name as the game keeps it, or null for a name of spaces only. */
export function cleanName(name: string): string | null {
  const clean = name.trim()
  return clean === '' ? null : clean
}

/** The name that two seats share, as the second of them writes it, or null. */
export function sharedName(seats: readonly Seat[]): string | null {
  const seen = new Set<string>()
  for (const seat of seats) {
    const key = nameKey(seat.name)
    if (seen.has(key)) return seat.name.trim()
    seen.add(key)
  }
  return null
}

/** The other seat that holds the name, or undefined. */
export function nameHolder(
  seats: readonly Seat[],
  id: string,
  name: string,
): Seat | undefined {
  const key = nameKey(name)
  return seats.find((s) => s.id !== id && nameKey(s.name) === key)
}

/** The other seat that holds the colour, or undefined. */
export function colourHolder(
  seats: readonly Seat[],
  id: string,
  colour: Colour,
): Seat | undefined {
  return seats.find((s) => s.id !== id && s.colour === colour)
}

/** The other seat that holds the faction, or undefined. */
export function factionHolder(
  seats: readonly Seat[],
  id: string,
  factionId: Seat['factionId'],
): Seat | undefined {
  if (factionId === null) return undefined
  return seats.find((s) => s.id !== id && s.factionId === factionId)
}

/**
 * The first colour that no seat holds. One always exists, because there are
 * eight colours and at most eight seats.
 */
export function firstFreeColour(seats: readonly Seat[]): Colour {
  const held = new Set(seats.map((s) => s.colour))
  return COLOURS.find((c) => !held.has(c)) ?? COLOURS[0]
}

/**
 * The seats after the seat of `id` gets `values`. A device that does not
 * `take` picks only a colour and a faction that no other seat holds. A
 * device that takes, as an admin device does, moves them to the seat: the
 * seat that held the colour gets the first free colour, and the seat that
 * held the faction has none again. Two seats never share a name. Returns
 * null when the values are not valid. The seats can come back unchanged.
 */
export function editSeat(
  seats: readonly Seat[],
  id: string,
  values: SeatValues,
  take: boolean,
): Seat[] | null {
  const name = cleanName(values.name)
  if (name === null || !seats.some((s) => s.id === id)) return null
  if (nameHolder(seats, id, name)) return null
  const colourOf = colourHolder(seats, id, values.colour)
  const factionOf = factionHolder(seats, id, values.factionId)
  if (!take && (colourOf || factionOf)) return null
  const { colour, factionId } = values
  const edited = seats.map((s) =>
    s.id === id ? { ...s, name, colour, factionId } : s,
  )
  const free = firstFreeColour(edited)
  return edited.map((s) => {
    if (s.id === id) return s
    const next = {
      ...s,
      colour: s.id === colourOf?.id ? free : s.colour,
      factionId: s.id === factionOf?.id ? null : s.factionId,
    }
    return next.colour === s.colour && next.factionId === s.factionId ? s : next
  })
}

/** Whether two seat lists hold the same seats in the same order. */
export function sameSeats(a: readonly Seat[], b: readonly Seat[]): boolean {
  return (
    a.length === b.length &&
    a.every((s, i) => {
      const t = b[i]
      return (
        t !== undefined &&
        s.id === t.id &&
        s.name === t.name &&
        s.colour === t.colour &&
        s.factionId === t.factionId
      )
    })
  )
}

/**
 * The seats after the seat of `id` moves to the place of `toId`, and the
 * seats between shift by one. Returns null when a seat is unknown or the
 * two are the same.
 */
export function moveSeat(
  seats: readonly Seat[],
  id: string,
  toId: string,
): Seat[] | null {
  const from = seats.findIndex((s) => s.id === id)
  const to = seats.findIndex((s) => s.id === toId)
  if (from < 0 || to < 0 || from === to) return null
  return moveItem(seats, from, to)
}

/**
 * Gives each seat without a faction a random faction of the base game or
 * of an expansion that is on, which no seat holds. Returns null when no
 * seat changes, also when the pool runs out.
 */
export function dealSeats(
  seats: readonly Seat[],
  expansions: Expansions,
  random: Random,
): Seat[] | null {
  const held = seats.map((s) => s.factionId)
  const dealt = dealFactions(held, seats.length, expansions, random)
  const next = seats.map((s, i) => {
    const factionId = dealt[i] ?? null
    return factionId === s.factionId ? s : { ...s, factionId }
  })
  return next.some((s, i) => s !== seats[i]) ? next : null
}

/** The seats as the players of the game, when every seat has a faction. */
export function seatedPlayers(seats: readonly Seat[]): Player[] | null {
  const players: Player[] = []
  for (const { factionId, ...seat } of seats) {
    if (factionId === null) return null
    players.push({ ...seat, factionId })
  }
  return players
}
