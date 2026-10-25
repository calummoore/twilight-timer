import { applyGameChange, stampTime } from './game-change'
import type {
  Answer,
  Change,
  DeviceEntry,
  GameChange,
  Rejection,
  SeatChange,
  SeatView,
  SharedRecord,
  View,
} from './share'
import type { Game } from './types'

/** The game actions that player mode may send in this release. */
const PLAYER_ACTIONS: ReadonlySet<string> = new Set([
  'turnEnded',
  'passed',
  'strategyCardPlayed',
  'reactionDone',
])

export interface NewRecord {
  gameId: string
  code: string
  /** The game, already on the server clock. */
  game: Game
  deviceId: string
  secretHash: string
  tableSecretHash: string
}

/** A new shared game. The device that shares it gets table mode. */
export function createRecord(n: NewRecord): SharedRecord {
  return {
    version: 1,
    gameId: n.gameId,
    code: n.code,
    closed: false,
    rev: 0,
    game: n.game,
    private: Object.fromEntries(n.game.players.map((p) => [p.id, {}])),
    answered: {},
    devices: {
      [n.deviceId]: { role: 'table', secretHash: n.secretHash, seat: null },
    },
    tableSecretHash: n.tableSecretHash,
    seats: {},
    moves: {},
  }
}

/**
 * Admits a device. A known device must show its secret again. A device
 * with the table secret gets table mode, and every other device gets
 * player mode. Returns null when the secret does not match.
 */
export function admit(
  record: SharedRecord,
  deviceId: string,
  secretHash: string,
  tableSecretHash: string | null,
): SharedRecord | null {
  const known = record.devices[deviceId]
  if (known && known.secretHash !== secretHash) return null
  const table = tableSecretHash === record.tableSecretHash
  if (known && (known.role === 'table' || !table)) return record
  const seats = { ...record.seats }
  if (known?.seat) delete seats[known.seat]
  const entry: DeviceEntry = table
    ? { role: 'table', secretHash, seat: null }
    : { role: 'player', secretHash, seat: null }
  return { ...record, seats, devices: { ...record.devices, [deviceId]: entry } }
}

export function isGameChange(change: Change): change is GameChange {
  switch (change.kind) {
    case 'act':
    case 'undo':
    case 'pause':
    case 'resume':
    case 'limit':
    case 'enforce':
      return true
    default:
      return false
  }
}

/** Whether the role and the seat of a device allow the change. */
export function authorize(entry: DeviceEntry, change: Change): boolean {
  const seatRequest =
    change.kind === 'claimSeat' || change.kind === 'requestMove'
  if (entry.role === 'table') return !seatRequest
  if (seatRequest) return true
  if (change.kind !== 'act') return false
  const { input } = change
  return (
    PLAYER_ACTIONS.has(input.kind) &&
    'playerId' in input &&
    entry.seat !== null &&
    input.playerId === entry.seat
  )
}

export interface Applied {
  record: SharedRecord
  answer: Answer
  /** The change as it applied, with its stamped time, or null. */
  applied: Change | null
}

/**
 * Applies one change from a device. A tap id gets its first answer again,
 * so a resent tap applies once. The server clock `now` bounds the time.
 */
export function applyChange(
  record: SharedRecord,
  deviceId: string,
  change: Change,
  now: number,
): Applied {
  const first = record.answered[change.tapId]
  if (first) return { record, answer: first, applied: null }
  const refuse = (reason: Rejection): Applied =>
    remember(record, change.tapId, { ok: false, reason }, null)
  const entry = record.devices[deviceId]
  if (record.closed) return refuse('closed')
  if (!entry || !authorize(entry, change)) return refuse('role')
  const at = stampTime(record.game, change.at, now)
  if (isGameChange(change)) {
    const stamped: GameChange = { ...change, at }
    const game = applyGameChange(record.game, stamped)
    if (game === record.game) return refuse('stale')
    return accept({ ...record, game }, stamped)
  }
  const next = applySeatChange(record, deviceId, change)
  if (typeof next === 'string') return refuse(next)
  return accept(next, { ...change, at })
}

function accept(record: SharedRecord, applied: Change): Applied {
  const rev = record.rev + 1
  return remember({ ...record, rev }, applied.tapId, { ok: true, rev }, applied)
}

function remember(
  record: SharedRecord,
  tapId: string,
  answer: Answer,
  applied: Change | null,
): Applied {
  const answered = { ...record.answered, [tapId]: answer }
  return { record: { ...record, answered }, answer, applied }
}

function applySeatChange(
  record: SharedRecord,
  deviceId: string,
  change: SeatChange,
): SharedRecord | Rejection {
  if (change.kind === 'stopSharing') return { ...record, closed: true }
  const { seat } = change
  if (!record.game.players.some((p) => p.id === seat)) return 'stale'
  const seats = { ...record.seats }
  const moves = { ...record.moves }
  const devices = { ...record.devices }
  const give = (to: string) => {
    const old = seats[seat]
    const device = devices[to]
    if (!device) return
    if (old && devices[old]) devices[old] = { ...devices[old], seat: null }
    if (device.seat) delete seats[device.seat]
    seats[seat] = to
    devices[to] = { ...device, seat }
    delete moves[seat]
  }
  const holder = seats[seat]
  switch (change.kind) {
    case 'claimSeat':
    case 'requestMove':
      if (holder === deviceId || moves[seat] === deviceId) return 'stale'
      if (!holder) give(deviceId)
      else if (change.kind === 'claimSeat') return 'held'
      else moves[seat] = deviceId
      break
    case 'approveMove': {
      const asker = moves[seat]
      if (!asker || !devices[asker]) return 'stale'
      give(asker)
      break
    }
    case 'releaseSeat': {
      const device = holder ? devices[holder] : undefined
      if (!holder || !device) return 'stale'
      delete seats[seat]
      devices[holder] = { ...device, seat: null }
      break
    }
  }
  return { ...record, seats, moves, devices }
}

/** What one device sees. `online` holds the device ids with a connection. */
export function viewFor(
  record: SharedRecord,
  deviceId: string,
  online: ReadonlySet<string>,
): View | null {
  const entry = record.devices[deviceId]
  if (!entry) return null
  const mine = entry.role === 'player' && entry.seat ? entry.seat : null
  return {
    gameId: record.gameId,
    code: record.code,
    closed: record.closed,
    rev: record.rev,
    role: entry.role,
    seat: entry.seat,
    game: record.game,
    private: mine ? (record.private[mine] ?? {}) : null,
    seats: seatViews(record, deviceId, online),
  }
}

export function seatViews(
  record: SharedRecord,
  deviceId: string,
  online: ReadonlySet<string>,
): SeatView[] {
  return record.game.players.map(({ id }) => {
    const holder = record.seats[id]
    const asker = record.moves[id]
    return {
      seat: id,
      held: holder !== undefined,
      yours: holder === deviceId,
      online: holder !== undefined && online.has(holder),
      request: !asker ? 'none' : asker === deviceId ? 'yours' : 'other',
    }
  })
}
