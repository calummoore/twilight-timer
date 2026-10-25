import { tokenOwner } from './fold-orders'
import {
  close,
  closeReaction,
  followOrder,
  nextTurn,
  toEntry,
  type FoldState,
} from './fold-state'
import { leftOf } from './orders'

/**
 * A player leaves the game: they are eliminated, or they go home. They take
 * no more picks, turns, reactions, or votes, and their entries stay. The
 * last player cannot leave.
 */
export function removePlayer(
  s: FoldState,
  id: string,
  ms: number,
  wall: number,
): boolean {
  const onLeft = leftOf(s.seats, id)
  if (!onLeft || s.seats.length < 2) return false
  // The speaker token passes to the player on their left, as the rules say.
  if (id === s.speakerId) s.speakerId = onLeft
  s.seats = s.seats.filter((seat) => seat !== id)
  s.departures.push({ playerId: id, round: s.round })
  if (s.phase === 'strategy') {
    // The card returns to the common play area, so another player can take it.
    s.picks.delete(id)
    // The token goes back to the Naalu player, or out of the game with them.
    if (id === s.naaluTokenHolderId) s.naaluTokenHolderId = tokenOwner(s)
  }
  if (s.reaction) leaveReaction(s, id, ms, wall)
  else if (s.phase === 'action' && s.activeId === id) {
    close(s, ms, wall)
    nextTurn(s, ms)
  }
  followOrder(s, ms, wall)
  return true
}

/**
 * A waiting player who leaves counts as done. When the player who opened the
 * window leaves, their turn ends where the window began, and the next turn
 * starts when the window closes.
 */
function leaveReaction(
  s: FoldState,
  id: string,
  ms: number,
  wall: number,
): void {
  const r = s.reaction
  if (!r) return
  if (id === r.byId && s.suspended) {
    s.entries.push(toEntry(s, s.suspended, s.suspended.startMs, wall, false))
    s.suspended = null
  }
  if (r.others.includes(id) && !r.done.has(id)) {
    r.done.set(id, ms - r.startMs)
    if (r.done.size === r.others.length) closeReaction(s, ms)
  }
}
