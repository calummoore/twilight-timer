import type { ActionInput, Game, TimerKey, TimerLimit } from './types'

/**
 * The version of the messages between the app and the game server. Change
 * it when a message changes shape, so that older pages reload.
 */
export const PROTOCOL = 1

/** Table mode can do every action. Player mode acts for its own seat. */
export type Role = 'table' | 'player'

/**
 * The private part of one seat. This release keeps it empty, so that
 * private comments and a pre-selected card can come with no new protocol.
 */
export type SeatPrivate = Record<string, never>

interface ChangeBase {
  tapId: string
  /** The tap time on the shared clock. The server keeps it in order. */
  at: number
}

/** A change that edits the game itself. Every device applies it. */
export type GameChange = ChangeBase &
  (
    | { kind: 'act'; input: ActionInput }
    | { kind: 'undo'; actionId: string }
    | { kind: 'pause' }
    | { kind: 'resume' }
    | { kind: 'limit'; timer: TimerKey; limit: TimerLimit }
    | { kind: 'enforce'; enforce: boolean }
  )

/** A change that edits the seats or the sharing, not the game. */
export type SeatChange = ChangeBase &
  (
    | { kind: 'claimSeat'; seat: string }
    | { kind: 'requestMove'; seat: string }
    | { kind: 'approveMove'; seat: string }
    | { kind: 'releaseSeat'; seat: string }
    | { kind: 'stopSharing' }
  )

export type Change = GameChange | SeatChange

/** Why the server refused a change. */
export type Rejection =
  /** The change names a target that no longer applies. */
  | 'stale'
  /** The role or the seat of the device does not allow the change. */
  | 'role'
  /** The table stopped sharing the game. */
  | 'closed'
  /** Another device holds the seat. */
  | 'held'

export type Answer =
  { ok: true; rev: number } | { ok: false; reason: Rejection }

export interface DeviceEntry {
  role: Role
  secretHash: string
  seat: string | null
}

/** Everything that the game server stores for one shared game. */
export interface SharedRecord {
  version: 1
  gameId: string
  code: string
  closed: boolean
  /** The number of changes that applied. */
  rev: number
  game: Game
  /** The private part of each seat, by player id. */
  private: Record<string, SeatPrivate>
  /** The first answer to each tap id, also for a tap that undo removed. */
  answered: Record<string, Answer>
  /** The server record: never part of a view. */
  devices: Record<string, DeviceEntry>
  tableSecretHash: string
  /** Seat (player id) to the device id that holds it. */
  seats: Record<string, string>
  /** Seat to the device id that asks to move it. */
  moves: Record<string, string>
}

/** One seat as a device sees it. */
export interface SeatView {
  seat: string
  held: boolean
  yours: boolean
  online: boolean
  /** A move request: none, from this device, or from another device. */
  request: 'none' | 'yours' | 'other'
}

/** What the server sends to one device. It never holds a secret. */
export interface View {
  gameId: string
  code: string
  closed: boolean
  rev: number
  role: Role
  seat: string | null
  game: Game
  /** The private part of the seat of this device, in player mode only. */
  private: SeatPrivate | null
  seats: SeatView[]
}
