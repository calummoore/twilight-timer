import { isFields } from './parse-fields'
import { sharedName } from './seats'
import {
  buildOf,
  parseClientMessage,
  parseCreateRequest,
  type Command,
} from './protocol'
import type { Setup } from './setup'

/**
 * What the server does with a message from a device, and with a request
 * that creates a game. The page and the server must run the same build,
 * because the page runs the model too. So on the socket of a game, the
 * server answers a page of another build with the outdated message and
 * closes the connection, and none of its commands applies. A request that
 * creates a game is different: the server creates every game whose setup
 * it can read, also for a page of another build.
 */

/** What the server knows of a connection, from its hello. */
export interface Caller {
  /** The token of the browser, or null before the hello. */
  token: string | null
  /**
   * The build of the page, or null before the hello. A connection from a
   * build before builds had ids has a token and no build.
   */
  build: string | null
}

export type Receipt =
  /** A hello of this build: keep the token and the build, send the state. */
  | { type: 'hello'; token: string; build: string }
  /** A command on a connection of this build. */
  | { type: 'command'; token: string; rev: number; command: Command }
  /** A page of another build: send outdated, close, and apply nothing. */
  | { type: 'outdated' }
  | { type: 'ignore' }

const OUTDATED: Receipt = { type: 'outdated' }
const IGNORE: Receipt = { type: 'ignore' }

/**
 * Reads a message from a device on the connection of `caller`, for a server
 * of build `build`. A hello names the build of its page before anything
 * else, so a hello of another build is outdated, also when the rest of it
 * has the shape of another build. A command comes from the build of the
 * hello on its connection. The server ignores a hello without a build,
 * because its page cannot read the outdated message and would only connect
 * again. It also ignores a command before the hello, and a message that it
 * cannot read.
 */
export function receive(raw: unknown, build: string, caller: Caller): Receipt {
  if (isFields(raw) && raw.type === 'hello') {
    const page = buildOf(raw)
    if (page === null) return IGNORE
    if (page !== build) return OUTDATED
    const hello = parseClientMessage(raw)
    return hello?.type === 'hello'
      ? { type: 'hello', token: hello.token, build }
      : IGNORE
  }
  const { token } = caller
  if (token === null) return IGNORE
  if (caller.build !== build) return OUTDATED
  const message = parseClientMessage(raw)
  if (message?.type !== 'command') return IGNORE
  const { rev, command } = message
  return { type: 'command', token, rev, command }
}

export type CreateReceipt =
  | { type: 'create'; token: string; setup: Setup }
  /**
   * The server cannot read the setup of a page of another build, or two of
   * its seats share a name.
   */
  | { type: 'outdated' }
  /**
   * The server cannot read a request of its own build, or two of its seats
   * share a name.
   */
  | { type: 'invalid' }

/**
 * Reads a create request, for a server of build `build`. The server creates
 * every game whose setup it can read, also from a page of another build,
 * which reloads when it opens the game. When the server cannot read the
 * setup of a page of another build, or of a page that names no build, the
 * answer is outdated, so that the page reloads once to get this build. A
 * setup in which two seats share a name breaks the seat rules, so it gets
 * the same answers: invalid from this build, and outdated from another
 * build, whose page may lack the rule.
 */
export function receiveCreate(raw: unknown, build: string): CreateReceipt {
  const request = parseCreateRequest(raw)
  if (request && sharedName(request.setup.players) === null) {
    return { type: 'create', ...request }
  }
  return buildOf(raw) === build ? { type: 'invalid' } : { type: 'outdated' }
}
