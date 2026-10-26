import { followOrder, type FoldState } from './fold-state'

/**
 * Two players swap their seats on the ring, to fix a ring that does not match
 * the table. The ring changes from the tap on, so earlier picks and votes
 * keep the order of their time. The pick and vote orders derive again, and
 * the clock follows a new picker or voter. The empty seat of a player who
 * left keeps its place.
 */
export function swapSeats(
  s: FoldState,
  id: string,
  otherId: string,
  ms: number,
  wall: number,
): boolean {
  if (id === otherId || !s.seats.includes(id) || !s.seats.includes(otherId)) {
    return false
  }
  s.ring = s.ring.map((seat) =>
    seat === id ? otherId : seat === otherId ? id : seat,
  )
  s.seats = s.ring.filter((seat) => s.seats.includes(seat))
  followOrder(s, ms, wall)
  return true
}
