import { routePartykitRequest } from 'partyserver'
import { readCode } from '../src/model/codes'
import type { Env } from './env'

export { GameRoom } from './game-room'

/**
 * Routes `/parties/game-room/{code}` to the game server object of that
 * code. A request with a malformed code gets 404, and an address that
 * tries too many codes gets 429. The static files never reach this code.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const guard = async (
      req: Request,
      lobby: { party: string; name: string },
    ): Promise<Response | undefined> => {
      if (readCode(lobby.name) !== lobby.name) {
        return new Response('Not found', { status: 404 })
      }
      const address = req.headers.get('CF-Connecting-IP') ?? 'local'
      const outcome = await env.JOIN_LIMIT?.limit({ key: address })
      if (outcome && !outcome.success) {
        return new Response('Too many tries', { status: 429 })
      }
      return undefined
    }
    const routed = await routePartykitRequest(request, env, {
      onBeforeConnect: guard,
      onBeforeRequest: guard,
    })
    return routed ?? new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
