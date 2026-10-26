import { newCode, parseCode } from '../src/model/code'
import { parseCreateRequest } from '../src/model/protocol'
import { newRoom, roomOfGame } from '../src/model/room'

export { GameRoom } from './game-room'

/**
 * The routes of the game API. Every other path is a static asset, so the
 * Worker sees only /api/ requests.
 *
 * - POST /api/games creates a game from a setup or a saved game.
 * - GET /api/games/<code> says whether a game has the code.
 * - GET /api/games/<code>/socket opens the socket of the game.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/games') {
      return request.method === 'POST'
        ? create(request, env)
        : json({ error: 'method' }, 405)
    }
    const match = /^\/api\/games\/([^/]+)(\/socket)?$/.exec(pathname)
    const code = match?.[1] && parseCode(match[1])
    if (!match || !code) return json({ error: 'not found' }, 404)
    const room = env.GAMES.getByName(code)
    if (match[2]) return room.fetch(request)
    return (await room.exists())
      ? json({ code })
      : json({ error: 'missing' }, 404)
  },
} satisfies ExportedHandler<Env>

/** A new code can belong to a game already, so creation tries a few codes. */
const CODE_TRIES = 5

async function create(request: Request, env: Env): Promise<Response> {
  const body = parseCreateRequest(await request.json().catch(() => null))
  if (!body) return json({ error: 'invalid' }, 400)
  for (let i = 0; i < CODE_TRIES; i++) {
    const code = newCode(random)
    const room =
      'game' in body
        ? roomOfGame(code, body.game, body.token)
        : newRoom(code, body.setup, body.token)
    if (await env.GAMES.getByName(code).create(room)) {
      return json({ code }, 201)
    }
  }
  return json({ error: 'busy' }, 503)
}

/** A number from 0 up to but not including 1, from the secure source. */
function random(): number {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1))
  return value / 2 ** 32
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}
