import type { Device } from '../model/devices'
import { mayAct } from '../model/rights'
import type { ActionInput } from '../model/types'
import type { GameView } from '../model/view'

/** What this device may tap now, for the screens. */
export interface Rights {
  /** Whether the device may tap the action now. */
  may: (input: ActionInput) => boolean
  /** Whether the device is an admin with a connection. */
  admin: boolean
  /**
   * The line on a disabled main button: what the game waits for, such as
   * "Kira’s turn" from `whose`, or the table for a table tap. Null while the
   * device may tap, or while it has no connection.
   */
  waits: (input: ActionInput, whose: string | null) => string | null
}

/** A table tap waits for an admin device. */
const TABLE = 'Waiting for the table'

export function rightsOf(
  device: Device | undefined,
  game: GameView,
  connected: boolean,
): Rights {
  const may = (input: ActionInput) => connected && mayAct(device, input, game)
  return {
    may,
    admin: connected && !!device?.admin,
    waits: (input, whose) =>
      !connected || may(input) ? null : (whose ?? TABLE),
  }
}

/** "Kira’s turn": the thing of one player that the game waits for. */
export function whose(name: string | undefined, thing: string): string | null {
  return name ? `${name}’s ${thing}` : null
}
