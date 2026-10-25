import { PAUSE_REASONS, type Pause, type PauseReason } from './types'

/** The open pause at wall-clock time `now`. */
export interface PauseView {
  /** Time since the pause began. */
  elapsedMs: number
  /** The reason of the open range, or null for a plain pause. */
  reason: PauseReason | null
  /** Time since the open range began, or null for a plain pause. */
  reasonMs: number | null
}

/** The time and the number of the ranges of one reason, such as rule checks. */
export interface ReasonTotal {
  reason: PauseReason
  ms: number
  count: number
}

export function openPause(
  pauses: readonly Pause[],
  now: number,
): PauseView | null {
  const open = pauses.find((p) => p.to === null)
  if (!open) return null
  const range = open.reasons.find((r) => r.to === null)
  return {
    elapsedMs: Math.max(0, now - open.from),
    reason: range?.reason ?? null,
    reasonMs: range ? Math.max(0, now - range.from) : null,
  }
}

/**
 * Totals the reason ranges of every pause, in `PAUSE_REASONS` order. Plain
 * pause time counts nowhere. An open range runs up to `now`. A range counts
 * only inside its pause, so a broken saved range cannot count more than its
 * pause, and a range with no time inside it is not counted.
 */
export function reasonTotals(
  pauses: readonly Pause[],
  now: number,
): ReasonTotal[] {
  return PAUSE_REASONS.map((reason) => {
    let ms = 0
    let count = 0
    for (const p of pauses) {
      const end = p.to ?? now
      for (const r of p.reasons) {
        const inside = Math.min(r.to ?? now, end) - Math.max(r.from, p.from)
        if (r.reason !== reason || inside <= 0) continue
        ms += inside
        count += 1
      }
    }
    return { reason, ms, count }
  })
}
