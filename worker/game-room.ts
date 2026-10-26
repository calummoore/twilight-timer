import { DurableObject } from 'cloudflare:workers'
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
}

/**
 * One game under one join code. The object is the only writer of the game:
 * it checks each command, applies it with its own clock, saves the room,
 * and sends the state to every socket. Sockets hibernate between messages.
 */
export class GameRoom extends DurableObject<Env> {
  /** The stored room, kept in memory while the object is awake. */
  private room: Room | null = null

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
    socket.serializeAttachment({ token: null } satisfies Attachment)
    if (!(await this.load())) {
      socket.send(JSON.stringify({ type: 'missing' }))
      socket.close(1000, 'No game has this code')
    }
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    const room = await this.load()
    if (!room) return
    const message =
      typeof data === 'string' ? parseClientMessage(parseJson(data)) : null
    if (message?.type === 'hello') {
      ws.serializeAttachment({ token: message.token } satisfies Attachment)
      // The device gets the state, and the others see it connected.
      this.broadcast(room)
      return
    }
    const token = tokenOf(ws)
    if (!message || token === null) return
    const out = applyCommand(
      room,
      token,
      message.rev,
      message.command,
      Date.now(),
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

  private connected(closing?: WebSocket): Set<string> {
    const tokens = this.sockets(closing).map(tokenOf)
    return new Set(tokens.filter((t): t is string => t !== null))
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
    const now = Date.now()
    for (const ws of this.sockets(closing)) {
      const token = tokenOf(ws)
      if (token === null) continue
      ws.send(JSON.stringify(stateMessage(room, connected, token, now)))
    }
  }
}

function tokenOf(ws: WebSocket): string | null {
  const attachment: unknown = ws.deserializeAttachment()
  if (typeof attachment !== 'object' || attachment === null) return null
  const token = 'token' in attachment ? attachment.token : null
  return typeof token === 'string' ? token : null
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
