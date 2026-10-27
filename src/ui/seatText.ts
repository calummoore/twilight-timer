import { factionName } from '../model/factions'
import type { Seat } from '../model/types'

/** The faction of a seat as the lobby shows it, or that it has none yet. */
export function seatFaction(seat: Seat): string {
  return seat.factionId === null
    ? 'No faction yet'
    : factionName(seat.factionId)
}
