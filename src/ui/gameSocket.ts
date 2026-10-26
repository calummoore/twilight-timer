import { BUILD } from '../build'
import {
  PING_INTERVAL_MS,
  PONG_TIMEOUT_MS,
  WAKE_TIMEOUT_MS,
  checkBuild,
  nextOffset,
  retryDelay,
} from '../model/connection'
import { isFields } from '../model/parse-fields'
import {
  buildOf,
  parseServerMessage,
  type ClientMessage,
  type Notice,
  type ServerMessage,
} from '../model/protocol'
import type { KeyValueStore } from '../model/storage'
import { socketUrl } from './api'

type Timer = ReturnType<typeof setTimeout>

export type StateMessage = Extract<ServerMessage, { type: 'state' }>

/** What the socket of a game tells its owner. */
export interface SocketEvents {
  /** A state arrived. `offset` is the server clock minus the device's. */
  onState: (message: StateMessage, offset: number) => void
  /** The connection broke. The socket tries again on its own. */
  onLost: () => void
  /** The connection ended for good, with no new try. */
  onEnd: (notice: Notice) => void
}

export interface GameSocket {
  /** Sends a message, or returns false without an open connection. */
  send: (message: ClientMessage) => boolean
  /** Ends the socket for good. */
  close: () => void
}

/** One connection of the socket, with the ways to check it and to end it. */
interface Connection {
  ws: WebSocket
  ping: (timeoutMs: number) => void
  drop: () => void
}

/**
 * The reload guard in `sessionStorage`, which survives a reload of the tab.
 * When the browser blocks it, the guard keeps nothing, and the page stops
 * instead of a reload.
 */
const GUARD: KeyValueStore = {
  getItem: (key) => attempt(() => sessionStorage.getItem(key), null),
  setItem: (key, value) =>
    attempt(() => sessionStorage.setItem(key, value), undefined),
  removeItem: (key) => attempt(() => sessionStorage.removeItem(key), undefined),
}

/**
 * The socket of one game: hello with the token of the browser and the build
 * of the page, the state of the game, the offset to the server clock, pings
 * that find a dead connection, and new tries after a lost connection. A
 * message of another build reloads the page once. A notice of the server
 * ends the socket.
 */
export function openGameSocket(
  code: string,
  token: string,
  events: SocketEvents,
): GameSocket {
  let ended = false
  let attempt = 0
  let retry: Timer | undefined
  // The connection now, or null while the device waits to try again.
  let current: Connection | null = null

  // Each connection has its own timers, and one way to end: drop. A close, a
  // missed pong, and the end of the socket all drop it, so a dead
  // connection shows at once, and an old one cannot touch a new one.
  const connect = () => {
    clearTimeout(retry)
    if (ended) return
    const ws = new WebSocket(socketUrl(code))
    let sample: number | null = null
    let deadline: Timer | undefined
    let pings: Timer | undefined
    let dropped = false

    const drop = () => {
      if (dropped) return
      dropped = true
      clearTimeout(deadline)
      clearInterval(pings)
      ws.close()
      // An old connection ends quietly: only the current one tells.
      if (current?.ws !== ws) return
      current = null
      if (ended) return
      events.onLost()
      retry = setTimeout(connect, retryDelay(attempt++))
    }
    // A connection that does not answer a ping in time is dead.
    const ping = (timeoutMs: number) => {
      if (dropped || ws.readyState !== WebSocket.OPEN) return
      ws.send('ping')
      clearTimeout(deadline)
      deadline = setTimeout(drop, timeoutMs)
    }

    current = { ws, ping, drop }
    ws.addEventListener('open', () => {
      if (dropped) return
      attempt = 0
      const hello: ClientMessage = { type: 'hello', token, build: BUILD }
      ws.send(JSON.stringify(hello))
      pings = setInterval(() => ping(PONG_TIMEOUT_MS), PING_INTERVAL_MS)
    })
    ws.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (dropped) return
      clearTimeout(deadline)
      const raw = parseJson(typeof event.data === 'string' ? event.data : '')
      // The answer to a ping is text, not a message of the server.
      if (!isFields(raw)) return
      // The build comes first, so a page of another build reloads even when
      // it cannot read the rest.
      const check = checkBuild(GUARD, BUILD, buildOf(raw))
      if (check === 'reload') {
        end()
        location.reload()
        return
      }
      if (check === 'outdated') return finish('outdated')
      const message = parseServerMessage(raw)
      if (!message) return
      if (message.type !== 'state') return finish(message.type)
      sample = nextOffset(sample, message.serverTime, Date.now())
      events.onState(message, sample)
    })
    ws.addEventListener('close', drop)
  }

  const end = () => {
    ended = true
    clearTimeout(retry)
    current?.drop()
  }
  const finish = (notice: Notice) => {
    end()
    events.onEnd(notice)
  }

  // A phone that wakes up, or a browser that is online again, checks its
  // connection at once instead of at the next ping.
  const wake = () => {
    if (ended || document.visibilityState !== 'visible') return
    const state = current?.ws.readyState
    if (state === WebSocket.OPEN) current?.ping(WAKE_TIMEOUT_MS)
    else if (state !== WebSocket.CONNECTING) {
      // A closing connection ends through the drop path, then the next try
      // starts at once.
      current?.drop()
      attempt = 0
      connect()
    }
  }

  connect()
  document.addEventListener('visibilitychange', wake)
  window.addEventListener('online', wake)
  return {
    send(message) {
      const ws = current?.ws
      if (ws?.readyState !== WebSocket.OPEN) return false
      ws.send(JSON.stringify(message))
      return true
    },
    close() {
      end()
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
    },
  }
}

function attempt<T>(run: () => T, fallback: T): T {
  try {
    return run()
  } catch {
    return fallback
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
