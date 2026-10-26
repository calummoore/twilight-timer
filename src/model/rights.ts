import type { Device } from './devices'
import type { Command } from './protocol'
import type { ActionInput } from './types'
import type { GameView } from './view'

/**
 * Whether a device may send a command, given the game at the time it
 * applies, or null in the lobby. Every device may take a seat or join as a
 * table device. An admin may send every command. A seated device without
 * admin acts for its player when the game waits for them, and a viewer only
 * takes a seat. The server and the screens ask the same question.
 */
export function mayCommand(
  device: Device | undefined,
  command: Command,
  game: GameView | null,
): boolean {
  if (command.type === 'claim') return true
  if (!device) return false
  if (device.admin) return true
  if (command.type !== 'act' || device.seat === null || !game) return false
  return mayActFor(device.seat, command.input, game)
}

/** Whether a device may tap an action. */
export function mayAct(
  device: Device | undefined,
  input: ActionInput,
  game: GameView,
): boolean {
  return mayCommand(device, { type: 'act', input }, game)
}

/** The taps of a seated device without admin, for the player of its seat. */
function mayActFor(seat: string, input: ActionInput, game: GameView): boolean {
  const v = game.view
  const r = v.phase === 'action' ? v.reaction : null
  switch (input.kind) {
    case 'cardPicked':
      return (
        v.phase === 'strategy' && v.pickerId === seat && input.playerId === seat
      )
    case 'turnEnded':
    case 'passed':
    case 'strategyCardPlayed':
      return v.phase === 'action' && !r && v.activeId === seat
    case 'reactionDone':
      return r !== null && input.playerId === seat
    case 'reactionClosed':
    case 'reactionExtended':
      return r?.byId === seat
    case 'speakerMoved':
      // Politics: the player who played the card chooses the new speaker.
      return (
        r?.byId === seat &&
        r.speakerChoice !== null &&
        r.speakerChoice.options.includes(input.playerId)
      )
    case 'voteCast':
      return (
        v.phase === 'agenda' &&
        v.voters.some((x) => x.state === 'now' && x.playerId === seat)
      )
    default:
      return false
  }
}
