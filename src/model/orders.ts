export function rotate<T>(items: readonly T[], by: number): T[] {
  const n = items.length
  if (n === 0) return []
  const start = ((by % n) + n) % n
  return [...items.slice(start), ...items.slice(0, start)]
}

/** Strategy picks: the speaker first, then clockwise. */
export function pickOrder(
  seats: readonly string[],
  speakerId: string,
): string[] {
  return rotate(seats, seats.indexOf(speakerId))
}

/** The player on the left of `id`: the next seat clockwise. */
export function leftOf(
  seats: readonly string[],
  id: string,
): string | undefined {
  const at = seats.indexOf(id)
  return at < 0 ? undefined : seats[(at + 1) % seats.length]
}

/**
 * The ring after `id` moves into the seat of `toId`. The seated players
 * between them shift one seat toward the seat that `id` left, along the
 * shorter way round the table, or clockwise when both ways are as long. The
 * seats of the players who left keep their places. The ring stays as it is
 * when either player is not seated.
 */
export function moveInRing(
  ring: readonly string[],
  seated: readonly string[],
  id: string,
  toId: string,
): string[] {
  const slots = ring.flatMap((p, i) => (seated.includes(p) ? [i] : []))
  const order = slots.map((i) => ring[i])
  const n = order.length
  const from = order.indexOf(id)
  const to = order.indexOf(toId)
  if (from < 0 || to < 0) return [...ring]
  const ahead = (to - from + n) % n
  const step = ahead <= n - ahead ? 1 : -1
  const moved = [...order]
  for (let k = from; k !== to; k = (k + step + n) % n) {
    moved[k] = order[(k + step + n) % n]
  }
  moved[to] = id
  const out = [...ring]
  slots.forEach((slot, k) => {
    out[slot] = moved[k]
  })
  return out
}

/** Agenda votes: left of the speaker first, clockwise, speaker last. */
export function voteOrder(
  seats: readonly string[],
  speakerId: string,
): string[] {
  return rotate(seats, seats.indexOf(speakerId) + 1)
}

/** The initiative of the holder of the Naalu "0" token. */
const TOKEN_INITIATIVE = 0

export interface InitiativeSlot {
  playerId: string
  /** The lowest strategy card number, or 0 for the holder of the Naalu token. */
  initiative: number
}

/**
 * Action-phase turn order: the lowest initiative goes first. Initiative is
 * the lowest strategy card number of the player, except for the holder of
 * the Naalu "0" token. So a player with two cards has one place.
 */
export function initiativeOrder(
  picks: ReadonlyMap<string, readonly number[]>,
  tokenHolderId: string | null,
): InitiativeSlot[] {
  return [...picks]
    .map(([playerId, cards]) => ({
      playerId,
      initiative:
        playerId === tokenHolderId ? TOKEN_INITIATIVE : Math.min(...cards),
    }))
    .sort((a, b) => a.initiative - b.initiative)
}
