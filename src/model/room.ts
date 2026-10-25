import { parseRecord } from './record-parse'
import {
  admit,
  applyChange,
  createRecord,
  isGameChange,
  seatViews,
  viewFor,
} from './record'
import {
  parseClientMessage,
  type ClientMessage,
  type Refusal,
  type ServerMessage,
} from './room-messages'
import { PROTOCOL, type SharedRecord } from './share'

/** One connection to the game server, as the room sees it. */
export interface RoomConnection {
  readonly id: string
  /** The device of the connection, kept while the server sleeps. */
  readonly device: string | null
  setDevice(deviceId: string): void
  send(message: string): void
}

/** The storage of one shared game: one record as JSON text. */
export interface RoomStore {
  load(): string | null
  save(text: string): void
}

export interface RoomDeps {
  /** The join code: the name of this room. */
  code: string
  store: RoomStore
  connections(): Iterable<RoomConnection>
  /** A one-way hash for device secrets and the table secret. */
  hash(secret: string): string
}

/** What a code check over HTTP answers. */
export type CodeState = 'open' | 'closed' | 'none' | 'broken'

/**
 * The game server for one shared game. It holds one shared-game record,
 * applies the changes of its connections one at a time, and sends each
 * device its view. The Durable Object only connects it to the network.
 */
export class Room {
  private record: SharedRecord | null | 'broken' | undefined
  private readonly deps: RoomDeps

  constructor(deps: RoomDeps) {
    this.deps = deps
  }

  /** Whether the code holds a game, for the code check before a join. */
  check(): CodeState {
    const record = this.load()
    if (record === 'broken') return 'broken'
    if (!record) return 'none'
    return record.closed ? 'closed' : 'open'
  }

  /** Handles one message from a connection at server time `now`. */
  message(conn: RoomConnection, text: string, now: number): void {
    const message = parseClientMessage(text)
    if (!message) return
    switch (message.t) {
      case 'ping':
        return send(conn, { t: 'pong', c: message.c, s: now })
      case 'hello':
      case 'share':
        return this.join(conn, message, now)
      case 'change':
        return this.change(conn, message.change, now)
    }
  }

  /** Tells the other devices that a connection closed. */
  closed(conn: RoomConnection, now: number): void {
    this.sendSeats(now, conn.id)
  }

  private join(
    conn: RoomConnection,
    message: Extract<ClientMessage, { t: 'hello' | 'share' }>,
    now: number,
  ): void {
    if (message.protocol < PROTOCOL) {
      return send(conn, { t: 'reload', protocol: PROTOCOL })
    }
    const { hash } = this.deps
    const record = this.load()
    if (record === 'broken') return refuse(conn, 'broken')
    let next: SharedRecord | null
    if (message.t === 'share') {
      if (record || message.game.timeBase !== 'server') {
        return refuse(conn, 'taken')
      }
      next = createRecord({
        gameId: message.gameId,
        code: this.deps.code,
        game: message.game,
        deviceId: message.deviceId,
        secretHash: hash(message.secret),
        tableSecretHash: hash(message.tableSecret),
      })
    } else {
      if (!record) return refuse(conn, 'none')
      const table = message.tableSecret ? hash(message.tableSecret) : null
      next = admit(record, message.deviceId, hash(message.secret), table)
      if (!next) return refuse(conn, 'denied')
    }
    if (next !== record) this.save(next)
    conn.setDevice(message.deviceId)
    this.sendView(conn, next, now)
    this.sendSeats(now, conn.id, true)
  }

  private change(
    conn: RoomConnection,
    change: Extract<ClientMessage, { t: 'change' }>['change'],
    now: number,
  ): void {
    const record = this.load()
    const device = conn.device
    if (record === 'broken') return refuse(conn, 'broken')
    if (!record) return refuse(conn, 'none')
    if (!device) return
    const result = applyChange(record, device, change, now)
    if (result.record !== record) this.save(result.record)
    const { applied } = result
    if (applied && isGameChange(applied)) {
      const message = {
        t: 'applied' as const,
        rev: result.record.rev,
        change: applied,
        now,
      }
      for (const other of this.joined()) send(other, message)
    } else if (applied) {
      for (const other of this.joined()) {
        this.sendView(other, result.record, now)
      }
    }
    send(conn, { t: 'answer', tapId: change.tapId, answer: result.answer, now })
  }

  private load(): SharedRecord | null | 'broken' {
    if (this.record === undefined) {
      const text = this.deps.store.load()
      this.record =
        text === null ? null : (parseRecord(parseJson(text)) ?? 'broken')
    }
    return this.record
  }

  private save(record: SharedRecord): void {
    this.record = record
    this.deps.store.save(JSON.stringify(record))
  }

  private joined(): RoomConnection[] {
    return [...this.deps.connections()].filter((c) => c.device !== null)
  }

  private online(skip?: string): Set<string> {
    const devices = this.joined()
      .filter((c) => c.id !== skip)
      .map((c) => c.device ?? '')
    return new Set(devices)
  }

  private sendView(conn: RoomConnection, record: SharedRecord, now: number) {
    const view = conn.device && viewFor(record, conn.device, this.online())
    if (view) send(conn, { t: 'view', view, now })
  }

  /** Sends the seats to the other devices, when presence changed. */
  private sendSeats(now: number, skip: string, keep = false): void {
    const record = this.load()
    if (!record || record === 'broken') return
    const online = this.online(keep ? undefined : skip)
    for (const other of this.joined()) {
      if (other.id === skip || !other.device) continue
      const seats = seatViews(record, other.device, online)
      send(other, { t: 'seats', seats, now })
    }
  }
}

function send(conn: RoomConnection, message: ServerMessage): void {
  conn.send(JSON.stringify(message))
}

function refuse(conn: RoomConnection, reason: Refusal): void {
  send(conn, { t: 'refused', reason })
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
