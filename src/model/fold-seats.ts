import { followOrder, type FoldState } from './fold-state'
import { moveInRing } from './orders'

/**
 * A player moves into the seat of another, to fix a ring that does not match
 * the table, and the seated players between shift one seat into the gap. The
 * ring changes from the tap on, so earlier picks and votes keep the order of
 * their time. The pick and vote orders derive again, and the clock follows a
 * new picker or voter. The empty seat of a player who left keeps its place.
 */
export function moveSeat(
  s: FoldState,
  id: string,
  toId: string,
  ms: number,
  wall: number,
): boolean {
  if (id === toId || !s.seats.includes(id) || !s.seats.includes(toId)) {
    return false
  }
  s.ring = moveInRing(s.ring, s.seats, id, toId)
  s.seats = s.ring.filter((seat) => s.seats.includes(seat))
  followOrder(s, ms, wall)
  return true
}
