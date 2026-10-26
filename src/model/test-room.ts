import { derive } from './derive'
import type { Command } from './protocol'
import {
  applyCommand,
  newRoom,
  parseRoom,
  roomOfGame,
  type Rejection,
  type Room,
} from './room'
import { DEFAULT_LIMITS } from './settings'
import type { Setup } from './setup'
import { PICKS, PLAYERS, SEC, T0 } from './test-table'
import type { ActionInput, Game } from './types'

/** Test support: a game on the server, with a fake server clock. */

export const CODE = '7QK2HN'
/** The iPad in the middle of the table, which created the game. */
export const HOST = 'host-token-0000000001'
export const JAZ = 'jaz-token-00000000002'
export const KIRA = 'kira-token-0000000003'
export const LAPTOP = 'laptop-token-00000004'

export const SETUP: Setup = {
  players: PLAYERS,
  speakerId: 'jaz',
  enforceLimits: false,
  limits: DEFAULT_LIMITS,
}

export function server(room: Room = newRoom(CODE, SETUP, HOST)) {
  let now = T0
  let current = room
  // The devices that have no connection. Every other device is connected,
  // also the device that created the game before it joins.
  const away = new Set<string>()
  const connected = (sender: string) => {
    const tokens = current.members.map((m) => m.token)
    if (current.creator !== null) tokens.push(current.creator)
    tokens.push(sender)
    return new Set(tokens.filter((t) => !away.has(t) || t === sender))
  }
  return {
    get room() {
      return current
    },
    get now() {
      return now
    },
    wait(ms: number) {
      now += ms
    },
    /** The device of `token` loses its connection. */
    leave(token: string) {
      away.add(token)
    },
    /**
     * Sends a command from the device of `token`, on the current revision
     * unless `rev` names another. Returns the rejection, or null.
     */
    send(token: string, command: Command, rev = current.revision) {
      const out = applyCommand(
        current,
        token,
        rev,
        command,
        now,
        connected(token),
      )
      if ('rejected' in out) return out.rejected
      current = out.room
      return null
    },
    act(token: string, input: ActionInput): Rejection | null {
      return this.send(token, { type: 'act', input })
    },
    view() {
      return current.game && derive(current.game, now)
    },
  }
}

export type Server = ReturnType<typeof server>

/**
 * The game after a device continued it on the server, and the server stored
 * and read it again.
 */
export function onServer(game: Game): Game | undefined {
  const stored = JSON.stringify(roomOfGame(CODE, game, HOST))
  return parseRoom(JSON.parse(stored))?.game ?? undefined
}

/**
 * The host created the game on the iPad in the middle of the table, and
 * joined it as the table device, so the iPad is the first admin.
 */
export function tableServer(): Server {
  const s = server()
  s.send(HOST, { type: 'claim', seat: null })
  return s
}

/**
 * Jaz's phone holds Jaz's seat and Kira's phone holds Kira's, both without
 * admin, and the host starts the game.
 */
export function seatedServer(): Server {
  const s = tableServer()
  s.send(JAZ, { type: 'claim', seat: 'jaz' })
  s.send(KIRA, { type: 'claim', seat: 'kira' })
  s.send(HOST, { type: 'start' })
  return s
}

/** Every player picks the card of `PICKS` on the host, then the action phase starts. */
export function playStrategyOn(s: Server): void {
  const order = s.view()?.pickOrder ?? []
  for (const playerId of order) {
    s.wait(10 * SEC)
    s.act(HOST, { kind: 'cardPicked', playerId, card: PICKS[playerId] ?? 0 })
  }
  s.act(HOST, { kind: 'phaseStepped' })
}
