import type { Interval } from './types'

export type Range = readonly [number, number]

/** Sorted, non-overlapping ranges. An open interval ends at `openEnd`. */
export function mergeIntervals(
  intervals: readonly Interval[],
  openEnd: number,
): Range[] {
  const ranges = intervals
    .map((i): [number, number] => [i.from, i.to ?? openEnd])
    .filter(([from, to]) => to > from)
    .sort((x, y) => x[0] - y[0])
  const merged: [number, number][] = []
  for (const [from, to] of ranges) {
    const last = merged.at(-1)
    if (last && from <= last[1]) last[1] = Math.max(last[1], to)
    else merged.push([from, to])
  }
  return merged
}

/**
 * Maps wall-clock ms to entry ms: the time since the game started, minus
 * the excluded ranges. Every entry is timed on this clock, and callers
 * exclude every pause and undone range, so they charge nobody. Game time is
 * not this clock: it also counts rule checks.
 */
export function entryClock(
  startedAt: number,
  excluded: readonly Range[],
): (wall: number) => number {
  return (wall) => {
    let ms = wall - startedAt
    for (const [from, to] of excluded) {
      if (from >= wall) break
      ms -= Math.max(0, Math.min(to, wall) - Math.max(from, startedAt))
    }
    return Math.max(0, ms)
  }
}
