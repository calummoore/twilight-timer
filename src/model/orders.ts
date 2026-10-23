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

/** Action-phase turn order: the lowest strategy card goes first. */
export function initiativeOrder(picks: ReadonlyMap<string, number>): string[] {
  return [...picks.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)
}
