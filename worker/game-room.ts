import { DurableObject } from 'cloudflare:workers'
import { BUILD } from '../src/build'
import { isLive } from '../src/model/connection'
import type { Notice, ServerMessage } from '../src/model/protocol'
import { receive } from '../src/model/receive'
import { applyCommand, stateMessage, type Room } from '../src/model/room'
import { readRoom, type StoredRoom } from '../src/model/room-storage'

/** The key of the room in the storage of the object. */
const ROOM = 'room'

/** What the object keeps on each socket, so that it survives hibernation. */
interface Attachment {
  /** The token of the browser, from its hello, or null before it. */
  token: string | null
  /**
   * The build of the page, from its hello, or null before it. A socket from
   * a build before builds had ids has a token and no build.
   */
  build: string | null
  /** The time of the last message of the socket, in ms. */
  seenAt: number
}

/**
 * One game under one join code. The object is the only writer of the game:
 * it checks each command, applies it with its own clock, saves the room,
 * and sends the state to every socket. Sockets hibernate between messages.
 * A page of another build gets the outdated message, and the object closes
 * its socket.
 */
export class GameRoom extends DurableObject<Env> {
  /** The stored room, read once while the object is awake. */
  private stored: StoredRoom | null = null
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

  /**
   * Stores a new room. Returns false when the code has a game already, also
   * one that this build cannot read, so that nothing overwrites it.
   */
  async create(room: Room): Promise<boolean> {
    if ((await this.load()).status !== 'none') return false
    await this.save(room)
    return true
  }

  /** Whether the code has a game, also one that this build cannot read. */
  async exists(): Promise<boolean> {
    return (await this.load()).status !== 'none'
  }

  /**
   * Opens the socket of a device. A code with no game, or with a game that
   * this build cannot read, says so and closes.
   */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket', { status: 426 })
    }
    const { 0: client, 1: socket } = new WebSocketPair()
    this.ctx.acceptWebSocket(socket)
    socket.serializeAttachment({
      token: null,
      build: null,
      seenAt: Date.now(),
    } satisfies Attachment)
    const stored = await this.load()
    if (stored.status !== 'ok') this.refuse(socket, stored)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    const stored = await this.load()
    if (stored.status !== 'ok') return this.refuse(ws, stored)
    const { room } = stored
    const now = Date.now()
    const raw = typeof data === 'string' ? parseJson(data) : null
    const caller = attachmentOf(ws)
    const received = receive(raw, BUILD, caller)
    if (received.type === 'outdated') return this.notify(ws, 'outdated')
    const { token, build } = received.type === 'hello' ? received : caller
    // Every message is a sign of life, as every answered ping is.
    ws.serializeAttachment({ token, build, seenAt: now } satisfies Attachment)
    if (received.type === 'hello') {
      // The device gets the state. The others get it only when a connection
      // changed, so that a hello that asks for a fresh state costs little.
      if (key(this.connected()) === this.sent) this.send(ws, room)
      else this.broadcast(room)
      return
    }
    if (received.type !== 'command') return
    const out = applyCommand(
      room,
      received.token,
      received.rev,
      received.command,
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
    const stored = await this.load()
    if (stored.status === 'ok') this.broadcast(stored.room, closed)
  }

  private async load(): Promise<StoredRoom> {
    this.stored ??= readRoom(await this.ctx.storage.get(ROOM))
    return this.stored
  }

  private async save(room: Room) {
    await this.ctx.storage.put(ROOM, room)
    this.stored = { status: 'ok', room }
  }

  /** Tells a device that the code has no game, or one it cannot read. */
  private refuse(ws: WebSocket, stored: Exclude<StoredRoom, { status: 'ok' }>) {
    this.notify(ws, stored.status === 'none' ? 'missing' : 'unreadable')
  }

  /** Sends a notice, which ends the connection, and closes the socket. */
  private notify(ws: WebSocket, type: Notice) {
    if (sendTo(ws, { build: BUILD, type })) ws.close(1000, NOTICE_REASONS[type])
  }

  /** The open sockets, without one that is closing. */
  private sockets(closing?: WebSocket): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws !== closing && ws.readyState === WebSocket.OPEN)
  }

  /**
   * The tokens of the devices with a connection: an open socket that said
   * hello from this build and showed a sign of life lately. A device whose
   * battery died never closes its socket, so an open socket alone does not
   * count.
   */
  private connected(closing?: WebSocket): Set<string> {
    const now = Date.now()
    const tokens = this.sockets(closing).flatMap((ws) => {
      const { token, build } = attachmentOf(ws)
      const live = isLive(this.lastSeen(ws), now)
      return token !== null && build === BUILD && live ? [token] : []
    })
    return new Set(tokens)
  }

  /** The last message or answered ping of a socket, in ms. */
  private lastSeen(ws: WebSocket): number {
    const pong = this.ctx.getWebSocketAutoResponseTimestamp(ws)
    return Math.max(attachmentOf(ws).seenAt, pong?.getTime() ?? 0)
  }

  private send(ws: WebSocket, room: Room) {
    const now = Date.now()
    const { token } = attachmentOf(ws)
    sendTo(ws, stateMessage(room, this.connected(), token, now, BUILD))
  }

  /**
   * Sends each device that said hello its own state. A socket of another
   * build, which a deploy left open, gets outdated and closes instead.
   */
  private broadcast(room: Room, closing?: WebSocket) {
    const current: WebSocket[] = []
    for (const ws of this.sockets(closing)) {
      const { token, build } = attachmentOf(ws)
      if (token === null) continue
      if (build === BUILD) current.push(ws)
      else this.notify(ws, 'outdated')
    }
    const connected = this.connected(closing)
    this.sent = key(connected)
    const now = Date.now()
    for (const ws of current) {
      const { token } = attachmentOf(ws)
      sendTo(ws, stateMessage(room, connected, token, now, BUILD))
    }
  }
}

/** The reason of each close, for the logs of the browser. */
const NOTICE_REASONS: Record<Notice, string> = {
  missing: 'No game has this code',
  unreadable: 'This build cannot read the game',
  outdated: 'The page runs another build',
}

/**
 * Sends a message on a socket that is still open, and says whether it did.
 * The object closes a socket with a notice at once, but a message that was
 * on its way, such as the hello of the page, still arrives after the close.
 */
function sendTo(ws: WebSocket, message: ServerMessage): boolean {
  if (ws.readyState !== WebSocket.OPEN) return false
  ws.send(JSON.stringify(message))
  return true
}

function attachmentOf(ws: WebSocket): Attachment {
  const raw: unknown = ws.deserializeAttachment()
  if (typeof raw !== 'object' || raw === null) {
    return { token: null, build: null, seenAt: 0 }
  }
  const token =
    'token' in raw && typeof raw.token === 'string' ? raw.token : null
  const build =
    'build' in raw && typeof raw.build === 'string' ? raw.build : null
  const seenAt =
    'seenAt' in raw && typeof raw.seenAt === 'number' ? raw.seenAt : 0
  return { token, build, seenAt }
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
