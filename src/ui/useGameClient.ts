import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PING_INTERVAL_MS,
  PONG_TIMEOUT_MS,
  WAKE_TIMEOUT_MS,
  nextOffset,
  retryDelay,
} from '../model/connection'
import {
  parseServerMessage,
  type Command,
  type RoomState,
} from '../model/protocol'
import { socketUrl } from './api'

export type GameStatus =
  /** The device waits for the first state of the game. */
  | 'connecting'
  /** The device has the game and a connection. */
  | 'open'
  /** The device has the game, but no connection. Its taps wait. */
  | 'reconnecting'
  /** No game has the code. */
  | 'missing'

type Timer = ReturnType<typeof setTimeout>

/** One socket of the hook, with the ways to check it and to end it. */
interface Connection {
  ws: WebSocket
  ping: (timeoutMs: number) => void
  drop: () => void
}

export interface GameClient {
  status: GameStatus
  /** The game as the server sent it last, or null before the first state. */
  room: RoomState | null
  /** The id of this device in the game, or null before it joins. */
  you: string | null
  /** The server clock minus the device clock, in ms. */
  offset: number
  /**
   * Sends a command on the revision that the screen shows. Without a
   * connection it does nothing: a tap is not queued.
   */
  send: (command: Command) => void
}

/**
 * The socket of one game: hello with the token of the browser, the state of
 * the game, the offset to the server clock, pings that find a dead
 * connection, and new tries after a lost connection.
 */
export function useGameClient(code: string, token: string): GameClient {
  const [status, setStatus] = useState<GameStatus>('connecting')
  const [state, setState] = useState<{
    room: RoomState
    you: string | null
  } | null>(null)
  const [offset, setOffset] = useState(0)
  const socket = useRef<WebSocket | null>(null)

  useEffect(() => {
    let disposed = false
    let missing = false
    let attempt = 0
    let retry: Timer | undefined
    // The socket now, or null while the device waits to try again.
    let current: Connection | null = null

    // Each socket has its own timers, and one way to end: drop. A close, a
    // missed pong, and the end of the hook all drop the socket, so a dead
    // connection shows at once, and an old socket cannot touch a new one.
    const connect = () => {
      clearTimeout(retry)
      if (disposed || missing) return
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
        if (socket.current === ws) socket.current = null
        // An old socket ends quietly: only the current one changes the state.
        if (current?.ws !== ws) return
        current = null
        if (disposed || missing) return
        setStatus((s) => (s === 'open' ? 'reconnecting' : s))
        retry = setTimeout(connect, retryDelay(attempt++))
      }
      // A socket that does not answer a ping in time is dead.
      const ping = (timeoutMs: number) => {
        if (dropped || ws.readyState !== WebSocket.OPEN) return
        ws.send('ping')
        clearTimeout(deadline)
        deadline = setTimeout(drop, timeoutMs)
      }

      current = { ws, ping, drop }
      socket.current = ws
      ws.addEventListener('open', () => {
        if (dropped) return
        attempt = 0
        ws.send(JSON.stringify({ type: 'hello', token }))
        pings = setInterval(() => ping(PONG_TIMEOUT_MS), PING_INTERVAL_MS)
      })
      ws.addEventListener('message', (event: MessageEvent<unknown>) => {
        if (dropped) return
        clearTimeout(deadline)
        const data = typeof event.data === 'string' ? event.data : ''
        const message = parseServerMessage(parseJson(data))
        if (!message) return
        if (message.type === 'missing') {
          missing = true
          setStatus('missing')
          return
        }
        sample = nextOffset(sample, message.serverTime, Date.now())
        setOffset(sample)
        setState({ room: message.room, you: message.you })
        setStatus('open')
      })
      ws.addEventListener('close', drop)
    }

    // A phone that wakes up, or a browser that is online again, checks its
    // connection at once instead of at the next ping.
    const wake = () => {
      if (disposed || missing || document.visibilityState !== 'visible') return
      const state = current?.ws.readyState
      if (state === WebSocket.OPEN) current?.ping(WAKE_TIMEOUT_MS)
      else if (state !== WebSocket.CONNECTING) {
        // A closing socket ends through the drop path, then the next try
        // starts at once.
        current?.drop()
        attempt = 0
        connect()
      }
    }

    connect()
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('online', wake)
    return () => {
      disposed = true
      clearTimeout(retry)
      current?.drop()
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
    }
  }, [code, token])

  const revision = state?.room.revision ?? null
  const send = useCallback(
    (command: Command) => {
      const ws = socket.current
      if (revision === null || ws?.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ type: 'command', rev: revision, command }))
    },
    [revision],
  )

  return {
    status,
    room: state?.room ?? null,
    you: state?.you ?? null,
    offset,
    send,
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
