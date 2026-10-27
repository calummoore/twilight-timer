import { factionName } from '../model/factions'
import type { Colour } from '../model/rules'
import {
  cleanName,
  colourHolder,
  factionHolder,
  nameHolder,
} from '../model/seats'
import type { Seat, SeatValues } from '../model/types'

/** The faction of a seat as the lobby shows it, or that it has none yet. */
export function seatFaction(seat: Seat): string {
  return seat.factionId === null
    ? 'No faction yet'
    : factionName(seat.factionId)
}

/**
 * Whether the name is still the default of Setup, "Player" and a number. A
 * form then starts with an empty field and the default as its hint.
 */
export function isDefaultName(name: string): boolean {
  return /^Player \d+$/.test(name)
}

/** The colour as a word, for a seat whose colour is fixed. */
export function colourName(colour: Colour): string {
  return colour.charAt(0).toUpperCase() + colour.slice(1)
}

/**
 * Why the seat cannot get the values, as a line for the player, or null. A
 * device that takes a value, as an admin device does, has no taken value.
 */
export function seatProblem(
  seats: readonly Seat[],
  seat: Seat,
  values: SeatValues,
  takes: boolean,
): string | null {
  const name = cleanName(values.name)
  if (name === null) return 'Give the seat a name.'
  const twin = nameHolder(seats, seat.id, name)
  if (twin) return `${twin.name} is taken.`
  if (takes) return null
  const colourOf = colourHolder(seats, seat.id, values.colour)
  if (colourOf) return `${colourOf.name} has that colour.`
  const factionOf = factionHolder(seats, seat.id, values.factionId)
  if (factionOf) return `${factionOf.name} has that faction.`
  return null
}

/** Whether the values are those of the seat, so a save would change nothing. */
export function sameValues(seat: Seat, values: SeatValues): boolean {
  return (
    cleanName(values.name) === seat.name &&
    values.colour === seat.colour &&
    values.factionId === seat.factionId
  )
}

/** The values of a seat, as a form starts with them. */
export function valuesOf(seat: Seat): SeatValues {
  const { name, colour, factionId } = seat
  return { name, colour, factionId }
}
