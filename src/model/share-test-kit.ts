import { aim } from './aim'
import { derive } from './derive'
import { createRecord } from './record'
import type { Change, SharedRecord } from './share'
import { PICKS, T0, table } from './test-table'
import { toServerTime } from './time-base'
import type { Intent } from './types'

/** Test support: shared records, rooms, and taps for the sync tests. */

export const OFFSET = 5_000
export const hash = (secret: string) => `hash:${secret}`

/** A shared game in the action phase: Tom acts first. */
export function sharedRecord(): SharedRecord {
  const t = table()
  for (const id of t.view().pickOrder) {
    t.act({ kind: 'cardPicked', playerId: id, card: PICKS[id] ?? 0 })
  }
  t.act({ kind: 'phaseStepped' })
  return createRecord({
    gameId: 'game-1',
    code: 'ABC234',
    game: toServerTime(t.game, OFFSET),
    deviceId: 'ipad',
    secretHash: hash('ipad-secret'),
    tableSecretHash: hash('table-secret'),
  })
}

/** The server time a little after the shared game started. */
export const NOW = T0 + OFFSET + 60_000

let taps = 0

/** A change that a device makes from what its screen shows. */
export function tap(
  record: SharedRecord,
  intent: Intent,
  at = NOW,
): Change & { kind: 'act' } {
  const input = aim(derive(record.game, at), intent)
  if (!input) throw new Error(`nothing to aim ${intent.kind} at`)
  return { kind: 'act', tapId: `share-tap-${++taps}`, at, input }
}

export function nextTapId(): string {
  return `share-tap-${++taps}`
}
