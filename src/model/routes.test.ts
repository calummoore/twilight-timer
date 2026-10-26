import { describe, expect, it } from 'vitest'
import {
  GAME_PANELS,
  HOME,
  SETUP,
  codeOfRoute,
  joinLink,
  parseRoute,
  routePath,
  settleRoute,
  startRoute,
  type GamePanel,
  type GameRoute,
  type Route,
} from './routes'

const JOIN: GameRoute = { screen: 'join', code: '7QK2HN' }

function game(panel: GamePanel | null = null, code = '7QK2HN'): GameRoute {
  return { screen: 'game', code, panel }
}

describe('addresses', () => {
  it('gives each screen its own address, and reads it back', () => {
    const routes: Route[] = [
      HOME,
      { screen: 'home', settings: true },
      SETUP,
      { screen: 'setup', settings: true },
      JOIN,
      game(),
      ...GAME_PANELS.map((panel) => game(panel)),
    ]
    expect(routes.map(routePath)).toEqual([
      '/',
      '/settings',
      '/new',
      '/new/settings',
      '/join/7QK2HN',
      '/game/7QK2HN',
      '/game/7QK2HN/players',
      '/game/7QK2HN/seating',
      '/game/7QK2HN/settings',
      '/game/7QK2HN/seat',
    ])
    for (const route of routes)
      expect(parseRoute(routePath(route))).toEqual(route)
  })

  it('reads a code in any case, and a slash at the end', () => {
    expect(parseRoute('/game/7qk2hn')).toEqual(game())
    expect(parseRoute('/game/7qk2hn/players/')).toEqual(game('players'))
    expect(parseRoute('/new/')).toEqual(SETUP)
  })

  it('opens Home at an address that no screen has', () => {
    const paths = [
      '/game',
      '/game/7QK2H0',
      '/game/7QK2HN/stats',
      '/game/7QK2HN/players/seat',
      '/join',
      '/new/7QK2HN',
      '/settings/7QK2HN',
      '/7QK2HN',
      '/index.html',
    ]
    for (const path of paths) expect(parseRoute(path)).toEqual(HOME)
  })
})

describe('join links', () => {
  it('holds the code in the path, and reads it in any case', () => {
    expect(routePath(JOIN)).toBe('/join/7QK2HN')
    expect(parseRoute('/join/7QK2HN')).toEqual(JOIN)
    expect(parseRoute('/join/7qk2hn/')).toEqual(JOIN)
    expect(parseRoute('/join/7QK2H0')).toEqual(HOME)
    expect(parseRoute('/')).toEqual(HOME)
    expect(parseRoute('/join/7QK2HN/extra')).toEqual(HOME)
  })

  it('opens the game at its own site, and reads out without the scheme', () => {
    expect(joinLink('https://ti4.nexus', '7QK2HN')).toEqual({
      url: 'https://ti4.nexus/join/7QK2HN',
      text: 'ti4.nexus/join/7QK2HN',
    })
    expect(joinLink('http://localhost:5173', '7QK2HN')).toEqual({
      url: 'http://localhost:5173/join/7QK2HN',
      text: 'localhost:5173/join/7QK2HN',
    })
  })

  it('gives a link that opens the same game', () => {
    const { url } = joinLink('https://ti4.nexus', '7QK2HN')
    expect(parseRoute(new URL(url).pathname)).toEqual(JOIN)
  })
})

describe('the open game', () => {
  it('is the game of the address, so Home and the setup close it', () => {
    expect(codeOfRoute(JOIN)).toBe('7QK2HN')
    expect(codeOfRoute(game('seating'))).toBe('7QK2HN')
    expect(codeOfRoute(HOME)).toBeNull()
    expect(codeOfRoute({ screen: 'home', settings: true })).toBeNull()
    expect(codeOfRoute(SETUP)).toBeNull()
  })

  it('opens at a new visit to Home', () => {
    expect(startRoute('/', '7QK2HN', false)).toEqual(game())
    expect(startRoute('/nothing', '7QK2HN', false)).toEqual(game())
    expect(startRoute('/', null, false)).toEqual(HOME)
  })

  it('stays closed on a reload of Home, and on Back to Home', () => {
    expect(startRoute('/', '7QK2HN', true)).toEqual(HOME)
  })

  it('gives way to the address of another screen', () => {
    expect(startRoute('/new', '7QK2HN', false)).toEqual(SETUP)
    expect(startRoute('/settings', '7QK2HN', false)).toEqual({
      screen: 'home',
      settings: true,
    })
    expect(startRoute('/game/K8N3VT', '7QK2HN', false)).toEqual(
      game(null, 'K8N3VT'),
    )
    expect(startRoute('/join/K8N3VT/', '7QK2HN', true)).toEqual({
      screen: 'join',
      code: 'K8N3VT',
    })
  })
})

describe('a game address', () => {
  it('shows the claim screen until the device joins', () => {
    for (const route of [JOIN, game(), game('players'), game('seat')]) {
      expect(settleRoute(route, false, 'action')).toEqual(JOIN)
    }
    expect(settleRoute(game('settings'), false, 'lobby')).toEqual(JOIN)
    expect(settleRoute(game(), false, 'ended')).toEqual(JOIN)
  })

  it('shows the game once the device joined', () => {
    expect(settleRoute(JOIN, true, 'lobby')).toEqual(game())
    expect(settleRoute(JOIN, true, 'action')).toEqual(game())
    expect(settleRoute(JOIN, true, 'ended')).toEqual(game())
  })

  it('keeps each panel of the running game', () => {
    for (const phase of [
      'strategy',
      'action',
      'status',
      'agenda',
      'summary',
    ] as const) {
      for (const panel of GAME_PANELS) {
        expect(settleRoute(game(panel), true, phase)).toEqual(game(panel))
      }
      expect(settleRoute(game(), true, phase)).toEqual(game())
    }
  })

  it('settles once, so the address changes at most once', () => {
    const routes = [JOIN, game(), ...GAME_PANELS.map((panel) => game(panel))]
    const phases = ['lobby', 'strategy', 'action', 'summary', 'ended'] as const
    for (const route of routes) {
      for (const joined of [false, true]) {
        for (const phase of phases) {
          const settled = settleRoute(route, joined, phase)
          expect(settleRoute(settled, joined, phase)).toEqual(settled)
        }
      }
    }
  })

  it('closes the panels that the lobby and the stats have not got', () => {
    expect(settleRoute(game('players'), true, 'lobby')).toEqual(game())
    expect(settleRoute(game('seating'), true, 'lobby')).toEqual(game())
    expect(settleRoute(game('settings'), true, 'lobby')).toEqual(
      game('settings'),
    )
    expect(settleRoute(game('seat'), true, 'lobby')).toEqual(game('seat'))
    for (const panel of GAME_PANELS) {
      expect(settleRoute(game(panel), true, 'ended')).toEqual(game())
    }
  })
})
