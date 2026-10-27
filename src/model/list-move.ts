/** A move in a list: an item goes to another index, and the items between shift. */

/** The list after the item at `from` moves to `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  if (item === undefined) return [...list]
  next.splice(to, 0, item)
  return next
}

/** Where the item at index `at` goes when the item at `from` moves to `to`. */
export function movedIndex(at: number, from: number, to: number): number {
  if (at === from) return to
  if (from < to && at > from && at <= to) return at - 1
  if (to < from && at >= to && at < from) return at + 1
  return at
}
