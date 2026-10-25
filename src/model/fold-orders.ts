import type { FoldState } from './fold-state'
import {
  initiativeOrder,
  pickOrder,
  voteOrder,
  type InitiativeSlot,
} from './orders'
import { cardsEach } from './rules'

/** Who acts next: readers of the fold state that change nothing. */

/**
 * The picks go round the pick order once for each card, so the next picker
 * is the first player in pick order with the fewest cards, or null when
 * every player has their cards.
 */
export function currentPicker(s: FoldState): string | null {
  const order = pickOrder(s.seats, s.speakerId)
  const held = (id: string) => s.picks.get(id)?.length ?? 0
  const fewest = Math.min(...order.map(held))
  if (fewest >= cardsEach(s.game.players.length)) return null
  return order.find((id) => held(id) === fewest) ?? null
}

export function currentVoter(s: FoldState): string | null {
  const voted = s.agenda?.voted ?? []
  return (
    voteOrder(s.seats, s.speakerId).find((id) => !voted.includes(id)) ?? null
  )
}

/** This round's initiative order of the seated players, with the "0" token. */
export function turnOrder(s: FoldState): InitiativeSlot[] {
  return initiativeOrder(s.picks, s.naaluTokenHolderId).filter((slot) =>
    s.seats.includes(slot.playerId),
  )
}

/** The next seated player in initiative order who has not passed, or null. */
export function nextActive(s: FoldState): string | null {
  // The order keeps the players who left, so the count starts at their place.
  const order = initiativeOrder(s.picks, s.naaluTokenHolderId).map(
    (slot) => slot.playerId,
  )
  const from = s.activeId === null ? -1 : order.indexOf(s.activeId)
  for (let k = 1; k <= order.length; k++) {
    const id = order[(from + k) % order.length]
    if (id !== undefined && s.seats.includes(id) && !s.passed.has(id)) {
      return id
    }
  }
  return null
}

/** The owner of the Naalu "0" token while they are in the game, or null. */
export function tokenOwner(s: FoldState): string | null {
  const owner = s.game.naaluTokenOwnerId
  return owner !== null && s.seats.includes(owner) ? owner : null
}
