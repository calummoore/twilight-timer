/** `m:ss`, or `h:mm:ss` from one hour. Rounds down to the second. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** A countdown rounds up, so it shows 0:00 only when the time is up. */
export function countdown(ms: number): string {
  return clock(Math.ceil(Math.max(0, ms) / 1000) * 1000)
}

/** "2 hours 44 minutes", or "58 minutes 43 seconds" under one hour. */
export function words(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const unit = (n: number, name: string) => `${n} ${name}${n === 1 ? '' : 's'}`
  return h > 0
    ? `${unit(h, 'hour')} ${unit(m, 'minute')}`
    : `${unit(m, 'minute')} ${unit(s, 'second')}`
}

export function percent(part: number, whole: number): string {
  return `${whole > 0 ? Math.round((part / whole) * 100) : 0}%`
}

/**
 * A countdown while a limit applies, then `+overtime`. Without a limit, or
 * when `countDown` is false, the clock counts up.
 */
export function timerText(
  elapsedMs: number,
  limitMs: number | null,
  countDown: boolean,
): { text: string; over: boolean } {
  const over = limitMs !== null && elapsedMs > limitMs
  if (!countDown || limitMs === null) return { text: clock(elapsedMs), over }
  return over
    ? { text: `+${clock(elapsedMs - limitMs)}`, over }
    : { text: countdown(limitMs - elapsedMs), over }
}
