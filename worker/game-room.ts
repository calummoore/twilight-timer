import { DurableObject } from 'cloudflare:workers'
import { isLive } from '../src/model/connection'
import { parseClientMessage } from '../src/model/protocol'
import {
  applyCommand,
  parseRoom,
  stateMessage,
  type Room,
} from '../src/model/room'

/** The key of the room in the storage of the object. */
const ROOM = 'room'

/** What the object keeps on each socket, so that it survives hibernation. */
interface Attachment {
  /** The token of the browser, from its hello, or null before it. */
  token: string | null
  /** The time of the last message of the socket, in ms. */
  seenAt: number
}

/**
 * One game under one join code. The object is the only writer of the game:
 * it checks each command, applies it with its own clock, saves the room,
 * and sends the state to every socket. Sockets hibernate between messages.
 */
export class GameRoom extends DurableObject<Env> {
  /** The stored room, kept in memory while the object is awake. */
  private room: Room | null = null
  /** The connected tokens that the last state to every device named. */
  private sent: string | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // A device pings to find a dead connection. The answer does not wake
    // the object.
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    )
  }

  /** Stores a new room. Returns false when the code has a game already. */
  async create(room: Room): Promise<boolean> {
    if (await this.load()) return false
    await this.save(room)
    return true
  }

  async exists(): Promise<boolean> {
    return (await this.load()) !== null
  }

  /** Opens the socket of a device. A code with no game says so and closes. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket', { status: 426 })
    }
    const { 0: client, 1: socket } = new WebSocketPair()
    this.ctx.acceptWebSocket(socket)
    socket.serializeAttachment({
      token: null,
      seenAt: Date.now(),
    } satisfies Attachment)
    if (!(await this.load())) {
      socket.send(JSON.stringify({ type: 'missing' }))
      socket.close(1000, 'No game has this code')
    }
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    const room = await this.load()
    if (!room) return
    const now = Date.now()
    const message =
      typeof data === 'string' ? parseClientMessage(parseJson(data)) : null
    const token = message?.type === 'hello' ? message.token : tokenOf(ws)
    // Every message is a sign of life, as every answered ping is.
    ws.serializeAttachment({ token, seenAt: now } satisfies Attachment)
    if (message?.type === 'hello') {
      // The device gets the state. The others get it only when a connection
      // changed, so that a hello that asks for a fresh state costs little.
      if (key(this.connected()) === this.sent) this.send(ws, room)
      else this.broadcast(room)
      return
    }
    if (!message || token === null) return
    const out = applyCommand(
      room,
      token,
      message.rev,
      message.command,
      now,
      this.connected(),
    )
    if ('rejected' in out) {
      // The tap does nothing. The device gets the state again and re-renders.
      this.send(ws, room)
      return
    }
    await this.save(out.room)
    this.broadcast(out.room)
  }

  async webSocketClose(ws: WebSocket) {
    await this.disconnect(ws)
  }

  async webSocketError(ws: WebSocket) {
    await this.disconnect(ws)
  }

  /** The other devices see that the device of a closed socket is away. */
  private async disconnect(closed: WebSocket) {
    const room = await this.load()
    if (room) this.broadcast(room, closed)
  }

  private async load(): Promise<Room | null> {
    this.room ??= parseRoom(await this.ctx.storage.get(ROOM))
    return this.room
  }

  private async save(room: Room) {
    await this.ctx.storage.put(ROOM, room)
    this.room = room
  }

  /** The open sockets, without one that is closing. */
  private sockets(closing?: WebSocket): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws !== closing && ws.readyState === WebSocket.OPEN)
  }

  /**
   * The tokens of the devices with a connection: an open socket that said
   * hello and showed a sign of life lately. A device whose battery died
   * never closes its socket, so an open socket alone does not count.
   */
  private connected(closing?: WebSocket): Set<string> {
    const now = Date.now()
    const live = this.sockets(closing).filter((ws) =>
      isLive(this.lastSeen(ws), now),
    )
    return new Set(live.map(tokenOf).filter((t): t is string => t !== null))
  }

  /** The last message or answered ping of a socket, in ms. */
  private lastSeen(ws: WebSocket): number {
    const pong = this.ctx.getWebSocketAutoResponseTimestamp(ws)
    return Math.max(attachmentOf(ws).seenAt, pong?.getTime() ?? 0)
  }

  private send(ws: WebSocket, room: Room) {
    const message = stateMessage(
      room,
      this.connected(),
      tokenOf(ws),
      Date.now(),
    )
    ws.send(JSON.stringify(message))
  }

  /** Sends each device that said hello its own state. */
  private broadcast(room: Room, closing?: WebSocket) {
    const connected = this.connected(closing)
    this.sent = key(connected)
    const now = Date.now()
    for (const ws of this.sockets(closing)) {
      const token = tokenOf(ws)
      if (token === null) continue
      ws.send(JSON.stringify(stateMessage(room, connected, token, now)))
    }
  }
}

function attachmentOf(ws: WebSocket): Attachment {
  const raw: unknown = ws.deserializeAttachment()
  if (typeof raw !== 'object' || raw === null) return { token: null, seenAt: 0 }
  const token =
    'token' in raw && typeof raw.token === 'string' ? raw.token : null
  const seenAt =
    'seenAt' in raw && typeof raw.seenAt === 'number' ? raw.seenAt : 0
  return { token, seenAt }
}

function tokenOf(ws: WebSocket): string | null {
  return attachmentOf(ws).token
}

/** The connected tokens as one value, to compare two states. */
function key(connected: ReadonlySet<string>): string {
  return [...connected].sort().join(' ')
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
