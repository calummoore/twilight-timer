import { useCallback, useEffect, useRef, useState } from 'react'
import { BUILD } from '../build'
import type { Command, Notice, RoomState } from '../model/protocol'
import { openGameSocket, type GameSocket } from './gameSocket'

export type GameStatus =
  /** The device waits for the first state of the game. */
  | 'connecting'
  /** The device has the game and a connection. */
  | 'open'
  /** The device has the game, but no connection. Its taps wait. */
  | 'reconnecting'
  /**
   * The connection ended for good: no game has the code, the server cannot
   * read the game, or a reload did not bring the server's build.
   */
  | Notice

export interface GameClient {
  status: GameStatus
  /** The game as the server sent it last, or null before the first state. */
  room: RoomState | null
  /** The id of this device in the game, or null before it joins. */
  you: string | null
  /** This device created the game and joins it with admin. */
  creator: boolean
  /** The server clock minus the device clock, in ms. */
  offset: number
  /**
   * Asks the server for a fresh state, for example for the connections of
   * the devices, which the server does not send when a device goes quiet.
   */
  refresh: () => void
  /**
   * Sends a command on the revision that the screen shows. Without a
   * connection it does nothing: a tap is not queued.
   */
  send: (command: Command) => void
}

/** The game of one code, from its socket, as the screens show it. */
export function useGameClient(code: string, token: string): GameClient {
  const [status, setStatus] = useState<GameStatus>('connecting')
  const [state, setState] = useState<{
    room: RoomState
    you: string | null
    creator: boolean
  } | null>(null)
  const [offset, setOffset] = useState(0)
  const socket = useRef<GameSocket | null>(null)

  useEffect(() => {
    const opened = openGameSocket(code, token, {
      onState: ({ room, you, creator }, offset) => {
        setOffset(offset)
        setState({ room, you, creator })
        setStatus('open')
      },
      onLost: () => setStatus((s) => (s === 'open' ? 'reconnecting' : s)),
      onEnd: setStatus,
    })
    socket.current = opened
    return () => {
      socket.current = null
      opened.close()
    }
  }, [code, token])

  const revision = state?.room.revision ?? null
  const send = useCallback(
    (command: Command) => {
      if (revision === null) return
      socket.current?.send({ type: 'command', rev: revision, command })
    },
    [revision],
  )

  const refresh = useCallback(() => {
    socket.current?.send({ type: 'hello', token, build: BUILD })
  }, [token])

  return {
    status,
    room: state?.room ?? null,
    you: state?.you ?? null,
    creator: state?.creator ?? false,
    offset,
    refresh,
    send,
  }
}
