import { FACTIONS, type FactionId } from './factions'
import type { Expansions } from './settings'

/** A number from 0 up to but not including 1, as `Math.random` gives. */
export type Random = () => number

/** The factions of the base game and of each expansion that is on, in name order. */
export function factionsInPlay(expansions: Expansions): FactionId[] {
  return factionChoices(expansions, null)
}

/**
 * The factions that one seat can pick: the factions in play, and the faction
 * that the seat holds when its expansion is off. In name order.
 */
export function factionChoices(
  expansions: Expansions,
  held: FactionId | null,
): FactionId[] {
  return FACTIONS.filter(
    (f) => f.set === 'base' || expansions[f.set] || f.id === held,
  ).map((f) => f.id)
}

/**
 * Gives each empty seat a random faction in play that no row holds. Only the
 * first `seats` rows are seats. The rows after them keep their factions, and
 * the deal leaves those factions out too, so a larger count later has no
 * duplicate. When the pool runs out, the remaining seats stay empty.
 */
export function dealFactions(
  rows: readonly (FactionId | null)[],
  seats: number,
  expansions: Expansions,
  random: Random,
): (FactionId | null)[] {
  const pool = factionsInPlay(expansions).filter((id) => !rows.includes(id))
  return rows.map((held, i) => {
    if (held !== null || i >= seats || pool.length === 0) return held
    const at = Math.floor(random() * pool.length)
    const pick = Math.min(pool.length - 1, Math.max(0, at))
    const [dealt] = pool.splice(pick, 1)
    return dealt ?? null
  })
}
