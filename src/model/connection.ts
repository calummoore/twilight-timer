/** The clock and the retries of the connection to the game on the server. */

/**
 * The offset from the device clock to the server clock, in ms. A message
 * reaches the device later than the server sent it, so each sample is at
 * most the true offset, and the largest sample of a connection is the best.
 * The first sample of a connection gives null as `previous`.
 */
export function nextOffset(
  previous: number | null,
  serverTime: number,
  receivedAt: number,
): number {
  const sample = serverTime - receivedAt
  return previous === null ? sample : Math.max(previous, sample)
}

/** The waits before each new try after a lost connection, in ms. */
const RETRY_MS = [500, 1000, 2000, 4000, 8000] as const

/** The wait before try `attempt`, counted from 0, after a lost connection. */
export function retryDelay(attempt: number): number {
  const at = Math.min(Math.max(0, attempt), RETRY_MS.length - 1)
  return RETRY_MS[at] ?? RETRY_MS[0]
}

/** A connection that sends nothing back for this long after a ping is dead. */
export const PONG_TIMEOUT_MS = 10_000
/** The device pings this often, so that a dead connection shows. */
export const PING_INTERVAL_MS = 20_000
/** When the page shows again, a connection must answer a ping this fast. */
export const WAKE_TIMEOUT_MS = 3_000
