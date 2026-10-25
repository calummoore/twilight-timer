import { createHash } from 'node:crypto'
import { Server, type Connection, type WSMessage } from 'partyserver'
import { Room, type RoomConnection } from '../src/model/room'
import type { Env } from './env'

/** What a connection keeps while the object sleeps. */
interface ConnectionState {
  device: string | null
}

/**
 * The game server object of one shared game, named by its join code. It
 * only connects the room in `src/model/room.ts` to partyserver and to its
 * SQLite storage. The room holds every rule.
 */
export class GameRoom extends Server<Env> {
  static options = { hibernate: true }

  private room: Room | null = null

  private get core(): Room {
    if (this.room) return this.room
    const sql = this.ctx.storage.sql
    sql.exec(
      'CREATE TABLE IF NOT EXISTS record (id INTEGER PRIMARY KEY, json TEXT NOT NULL)',
    )
    this.room = new Room({
      code: this.name,
      store: {
        load: () => {
          const rows = sql
            .exec<{ json: string }>('SELECT json FROM record WHERE id = 1')
            .toArray()
          return rows[0]?.json ?? null
        },
        save: (text) => {
          sql.exec(
            'INSERT OR REPLACE INTO record (id, json) VALUES (1, ?)',
            text,
          )
        },
      },
      connections: () =>
        [...this.getConnections<ConnectionState>()].map(roomConnection),
      hash: (secret) => createHash('sha256').update(secret).digest('hex'),
    })
    return this.room
  }

  onMessage(connection: Connection<ConnectionState>, message: WSMessage) {
    if (typeof message !== 'string') return
    this.core.message(roomConnection(connection), message, Date.now())
  }

  onClose(connection: Connection<ConnectionState>) {
    this.core.closed(roomConnection(connection), Date.now())
  }

  /** The code check before a join: does this code hold a game? */
  onRequest(request: Request): Response {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }
    return Response.json({ state: this.core.check() })
  }
}

function roomConnection(
  connection: Connection<ConnectionState>,
): RoomConnection {
  return {
    id: connection.id,
    get device() {
      return connection.state?.device ?? null
    },
    setDevice(deviceId) {
      connection.setState({ device: deviceId })
    },
    send(text) {
      connection.send(text)
    },
  }
}
