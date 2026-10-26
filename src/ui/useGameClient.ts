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
    let ws: WebSocket | null = null
    let disposed = false
    let missing = false
    let attempt = 0
    let sample: number | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let deadline: ReturnType<typeof setTimeout> | undefined
    let pings: ReturnType<typeof setInterval> | undefined

    // A socket that does not answer a ping in time is dead, so it closes.
    const ping = (timeoutMs: number) => {
      if (ws?.readyState !== WebSocket.OPEN) return
      ws.send('ping')
      clearTimeout(deadline)
      const pinged = ws
      deadline = setTimeout(() => pinged.close(), timeoutMs)
    }

    const connect = () => {
      clearTimeout(retry)
      if (disposed || missing) return
      sample = null
      const next = new WebSocket(socketUrl(code))
      ws = next
      socket.current = next
      next.addEventListener('open', () => {
        attempt = 0
        next.send(JSON.stringify({ type: 'hello', token }))
        pings = setInterval(() => ping(PONG_TIMEOUT_MS), PING_INTERVAL_MS)
      })
      next.addEventListener('message', (event: MessageEvent<unknown>) => {
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
      next.addEventListener('close', () => {
        clearInterval(pings)
        clearTimeout(deadline)
        if (socket.current === next) socket.current = null
        if (disposed || missing || ws !== next) return
        setStatus((s) => (s === 'open' ? 'reconnecting' : s))
        retry = setTimeout(connect, retryDelay(attempt++))
      })
    }

    // A phone that wakes up, or a browser that is online again, checks its
    // connection at once instead of at the next ping.
    const wake = () => {
      if (disposed || missing || document.visibilityState !== 'visible') return
      if (ws?.readyState === WebSocket.OPEN) ping(WAKE_TIMEOUT_MS)
      else if (ws?.readyState !== WebSocket.CONNECTING) {
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
      clearTimeout(deadline)
      clearInterval(pings)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
      ws?.close()
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
