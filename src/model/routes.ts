import { parseCode } from './code'
import type { GameSummary } from './summary'

/**
 * The address of each screen. Each screen, and each panel over a game, has
 * its own address, so that Back returns to the screen before, a reload keeps
 * the screen, and a link opens it. The server moves the phase of a game, so
 * no address names a phase.
 */

/** A screen that a tap opens over a game, with its own address. */
export const GAME_PANELS = ['players', 'seating', 'settings', 'seat'] as const
export type GamePanel = (typeof GAME_PANELS)[number]

export type Route =
  /** Home, with Settings over it or not. */
  | { screen: 'home'; settings: boolean }
  /** The setup of a new game, with Settings over it or not. */
  | { screen: 'setup'; settings: boolean }
  /** The claim screen of a game. Its address is the join link. */
  | { screen: 'join'; code: string }
  /** A game: the lobby, the running game, or the stats, with a panel or not. */
  | { screen: 'game'; code: string; panel: GamePanel | null }

/** A route of one game. */
export type GameRoute = Extract<Route, { code: string }>

export const HOME: Route = { screen: 'home', settings: false }
export const SETUP: Route = { screen: 'setup', settings: false }

/** The route of an address. An address that no screen has opens Home. */
export function parseRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean)
  switch (parts.join('/')) {
    case '':
      return HOME
    case 'settings':
      return { screen: 'home', settings: true }
    case 'new':
      return SETUP
    case 'new/settings':
      return { screen: 'setup', settings: true }
  }
  const [first, second, third] = parts
  const code = second === undefined ? null : parseCode(second)
  if (!code || parts.length > 3) return HOME
  if (first === 'join' && parts.length === 2) return { screen: 'join', code }
  if (first !== 'game') return HOME
  if (parts.length === 2) return { screen: 'game', code, panel: null }
  const panel = GAME_PANELS.find((p) => p === third)
  return panel ? { screen: 'game', code, panel } : HOME
}

/** The address of a route, which `parseRoute` reads back. */
export function routePath(route: Route): string {
  switch (route.screen) {
    case 'home':
      return route.settings ? '/settings' : '/'
    case 'setup':
      return route.settings ? '/new/settings' : '/new'
    case 'join':
      return `/join/${route.code}`
    case 'game':
      return `/game/${route.code}${route.panel ? `/${route.panel}` : ''}`
  }
}

/**
 * The join link of a game on the site at `origin`, such as
 * `https://ti4.nexus`. The text is the same link without its scheme, as the
 * screen shows it and a player reads it out.
 */
export function joinLink(
  origin: string,
  code: string,
): { url: string; text: string } {
  const url = `${origin}${routePath({ screen: 'join', code })}`
  return { url, text: url.replace(/^https?:\/\//, '') }
}

/**
 * The game of a route, or null outside a game. The open game of a device is
 * the game of its address, so Home and the setup close it.
 */
export function codeOfRoute(route: Route): string | null {
  return route.screen === 'join' || route.screen === 'game' ? route.code : null
}

/**
 * The route that the app opens with. A new visit to Home opens the game that
 * the device had open, so that a closed tab finds its game again. A reload,
 * and Back or Forward to an entry of the history, show the address as it is.
 */
export function startRoute(
  pathname: string,
  current: string | null,
  revisit: boolean,
): Route {
  const route = parseRoute(pathname)
  const home = route.screen === 'home' && !route.settings
  if (!home || !current || revisit) return route
  return { screen: 'game', code: current, panel: null }
}

/** The panels over each stage of a game. */
const STAGE_PANELS = {
  // The lobby is Players & devices, and the seating opens with the game.
  lobby: ['settings', 'seat'],
  running: GAME_PANELS,
  // The stats have no panels.
  ended: [],
} as const satisfies Record<string, readonly GamePanel[]>

/**
 * The route that a game address shows, once the device has the game. A
 * device that has not joined sees the claim screen, and a device that joined
 * sees the game. A panel that the stage of the game has not got closes.
 */
export function settleRoute(
  route: GameRoute,
  joined: boolean,
  phase: GameSummary['phase'],
): GameRoute {
  const { code } = route
  if (!joined) return { screen: 'join', code }
  const stage = phase === 'lobby' || phase === 'ended' ? phase : 'running'
  const panels: readonly GamePanel[] = STAGE_PANELS[stage]
  const panel = route.screen === 'game' ? route.panel : null
  return {
    screen: 'game',
    code,
    panel: panel && panels.includes(panel) ? panel : null,
  }
}
