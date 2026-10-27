import type { Random } from './deal'
import { memberOf, takeSeat } from './devices'
import type { Room } from './room'
import {
  dealSeats,
  editSeat,
  moveSeat,
  sameSeats,
  seatedPlayers,
} from './seats'
import type { Setup } from './setup'
import type { Game, Seat, SeatValues } from './types'
import { startGame } from './commands'

/**
 * The commands that change the seats of a room: a claim with values, an
 * edit, a seat move, the deal, and Start game. Each returns the room after
 * the change, or null when the command changes nothing or is not valid.
 */

/**
 * Whether the device of `token` takes a value that another seat holds, as
 * an admin device does. The device that created the game joins with admin,
 * so it takes a value too.
 */
function takes(room: Room, token: string): boolean {
  return token === room.creator || !!memberOf(room.members, token)?.admin
}

/**
 * The seats after the seat of `id` gets `values`. After Start game, only
 * the name changes.
 */
function changeSeat(
  room: Room,
  id: string,
  values: SeatValues,
  take: boolean,
): Seat[] | null {
  const seat = room.setup.players.find((p) => p.id === id)
  if (!seat) return null
  if (room.game) {
    const fixed =
      values.colour === seat.colour && values.factionId === seat.factionId
    if (!fixed) return null
  }
  return editSeat(room.setup.players, id, values, take)
}

/** The game with the names of the seats, which the in-game screens show. */
function renamed(game: Game | null, seats: readonly Seat[]): Game | null {
  if (!game) return null
  const players = game.players.map((p) => {
    const seat = seats.find((s) => s.id === p.id)
    return seat && seat.name !== p.name ? { ...p, name: seat.name } : p
  })
  return players.every((p, i) => p === game.players[i])
    ? game
    : { ...game, players }
}

/** The room with new seats, and the game renamed with them. */
function withSeats(room: Room, setup: Setup): Room {
  return { ...room, setup, game: renamed(room.game, setup.players) }
}

/**
 * The device of `token` takes `seat`, with `values` when it gives any, or
 * becomes a table device with null. Before Start game, a seat needs a
 * faction before a device takes it.
 */
export function applyClaim(
  room: Room,
  token: string,
  seat: string | null,
  values: SeatValues | undefined,
): Room | null {
  const device = memberOf(room.members, token)
  const creator = token === room.creator
  const members = () => takeSeat(room.members, token, seat, creator)
  const joined = (next: Room): Room => ({
    ...next,
    members: members(),
    creator: creator ? null : room.creator,
  })
  if (seat === null) {
    if (device && device.seat === null) return null
    return joined(room)
  }
  if (!room.setup.players.some((p) => p.id === seat)) return null
  let setup = room.setup
  if (values) {
    const seats = changeSeat(room, seat, values, takes(room, token))
    if (!seats) return null
    setup = { ...room.setup, players: seats }
  }
  const after = setup.players.find((p) => p.id === seat)
  if (!room.game && after?.factionId === null) return null
  const same = sameSeats(setup.players, room.setup.players)
  if (same && device && device.seat === seat) return null
  return joined(same ? room : withSeats(room, setup))
}

/** The seat of `playerId` gets `values`, and the speaker token with `speaker`. */
export function applyEdit(
  room: Room,
  token: string,
  playerId: string,
  values: SeatValues,
  speaker: boolean,
): Room | null {
  const seats = changeSeat(room, playerId, values, takes(room, token))
  if (!seats) return null
  let setup: Setup = { ...room.setup, players: seats }
  if (speaker) {
    if (room.game) return null
    setup = { ...setup, speakerId: playerId }
  }
  const same =
    sameSeats(seats, room.setup.players) &&
    setup.speakerId === room.setup.speakerId
  return same ? null : withSeats(room, setup)
}

/** The seat of `playerId` moves to the place of `toId`, before Start game. */
export function applyMove(
  room: Room,
  playerId: string,
  toId: string,
): Room | null {
  if (room.game) return null
  const players = moveSeat(room.setup.players, playerId, toId)
  return players && { ...room, setup: { ...room.setup, players } }
}

/** Each seat without a faction gets a random faction, before Start game. */
export function applyDeal(room: Room, random: Random): Room | null {
  if (room.game) return null
  const { players, expansions } = room.setup
  const dealt = dealSeats(players, expansions, random)
  return dealt && { ...room, setup: { ...room.setup, players: dealt } }
}

/** Start game begins the game, once every seat has a faction. */
export function applyStart(room: Room, now: number): Room | null {
  if (room.game) return null
  const players = seatedPlayers(room.setup.players)
  if (!players) return null
  const { speakerId } = room.setup
  return { ...room, game: startGame(players, speakerId, room.setup, now) }
}
