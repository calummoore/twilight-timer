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
  /** The strategy card number, or 0 for the holder of the Naalu token. */
  initiative: number
}

/**
 * Action-phase turn order: the lowest initiative goes first. Initiative is
 * the strategy card number, except for the holder of the Naalu "0" token.
 */
export function initiativeOrder(
  picks: ReadonlyMap<string, number>,
  tokenHolderId: string | null,
): InitiativeSlot[] {
  return [...picks]
    .map(([playerId, card]) => ({
      playerId,
      initiative: playerId === tokenHolderId ? TOKEN_INITIATIVE : card,
    }))
    .sort((a, b) => a.initiative - b.initiative)
}
