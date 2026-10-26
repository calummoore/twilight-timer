import { parseCode } from '../model/code'
import type { CreateRequest } from '../model/protocol'

/** Calls to the game API of the Worker, on the origin of the app. */

/** A new game and its code, or the reason that the game has none. */
export type Created = { code: string } | { error: 'offline' }

/** Creates a game from a setup. */
export async function createGame(request: CreateRequest): Promise<Created> {
  try {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    const code = response.ok ? codeOf(await response.json()) : null
    return code ? { code } : { error: 'offline' }
  } catch {
    return { error: 'offline' }
  }
}

/** Whether a game has the code, or that the server cannot be reached. */
export type Lookup = 'found' | 'missing' | 'offline'

export async function lookUpGame(code: string): Promise<Lookup> {
  try {
    const response = await fetch(`/api/games/${code}`)
    if (response.status === 404) return 'missing'
    return response.ok ? 'found' : 'offline'
  } catch {
    return 'offline'
  }
}

/** The address of the socket of a game, on the origin of the app. */
export function socketUrl(code: string): string {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${location.host}/api/games/${code}/socket`
}

function codeOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('code' in body)) {
    return null
  }
  return typeof body.code === 'string' ? parseCode(body.code) : null
}
