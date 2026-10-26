import type { KeyValueStore } from './storage'

/**
 * The clock, the retries, and the build check of the connection to the game
 * on the server.
 */

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

/**
 * A device counts as connected while its socket showed a sign of life this
 * recently: a message, or a ping that the server answered. A hidden page may
 * ping only once a minute, so the window is longer than that.
 */
export const LIVE_MS = 90_000

/** Whether a socket whose last sign of life came at `lastSeen` is live. */
export function isLive(lastSeen: number, now: number): boolean {
  return now - lastSeen <= LIVE_MS
}

/** Players & devices asks for a fresh state this often while it is open. */
export const REFRESH_MS = 15_000

/** What a page does after it compares its build with the server's. */
export type BuildCheck =
  /** The page runs the build of the server. */
  | 'same'
  /** The page runs another build, so it reloads to get the server's. */
  | 'reload'
  /** A reload did not bring the server's build, so the page stops. */
  | 'outdated'

/** The build of the server that caused the last reload of the page. */
const RELOAD_KEY = 'ti4tempo.reload.v1'

/**
 * Compares the build that a message from the server names, or null when it
 * names none, with the build of the page. A page of another build reloads
 * once for each build of the server: `store` keeps the build that caused
 * the reload, and must survive the reload, as `sessionStorage` does. When
 * the same build causes a second mismatch, the page stops instead. A store
 * that cannot keep the build stops the page at once, so that a page never
 * reloads in a loop. A message of the page's build clears the guard.
 */
export function checkBuild(
  store: KeyValueStore,
  page: string,
  server: string | null,
): BuildCheck {
  if (server === page) {
    store.removeItem(RELOAD_KEY)
    return 'same'
  }
  // A server from before builds had ids names none.
  const cause = server ?? ''
  if (store.getItem(RELOAD_KEY) === cause) return 'outdated'
  store.setItem(RELOAD_KEY, cause)
  return store.getItem(RELOAD_KEY) === cause ? 'reload' : 'outdated'
}
