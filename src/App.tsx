import { useCallback, useEffect, useState } from 'react'
import {
  leaveGame,
  loadGames,
  loadToken,
  saveGames,
  seeGame,
  type RecentGame,
} from './model/device-store'
import { HOME, SETUP, codeOfRoute, startRoute } from './model/routes'
import { loadSettings, saveSettings, type KeyValueStore } from './model/storage'
import { unlockAudio } from './ui/alarm'
import { HomeRoute } from './ui/HomeRoute'
import { RoomScreen } from './ui/RoomScreen'
import { SettingsScreen } from './ui/screens/SettingsScreen'
import { SetupRoute } from './ui/SetupRoute'
import { Stage } from './ui/Stage'
import { useRoute } from './ui/useRoute'
import './styles/mockup/base.css'
import './styles/mockup/action.css'
import './styles/mockup/setup.css'
import './styles/mockup/strategy.css'
import './styles/mockup/reaction.css'
import './styles/mockup/phases.css'
import './styles/mockup/stats.css'
import './styles/mockup/seating.css'
import './styles/mockup/controls.css'
import './styles/mockup/multiplayer.css'
import './styles/app.css'
import './styles/screens.css'
import './styles/mockup/layout.css'
import './styles/mockup/responsive.css'

/** `localStorage`, or a memory store when the browser blocks storage. */
function openStore(): KeyValueStore {
  try {
    const probe = '__ti4tempo__'
    localStorage.setItem(probe, probe)
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    const data = new Map<string, string>()
    return {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
    }
  }
}

/** A new secret for this browser: 128 random bits as hex. */
function makeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * The app shows the screen of the address: Home, the setup of a new game, or
 * the game of one code, each with the panels over it. So Back, a reload, and
 * a link open the same screen.
 */
export function App() {
  const [store] = useState(openStore)
  const [token] = useState(() => loadToken(store, makeToken))
  const [settings, setSettings] = useState(() => loadSettings(store))
  const [stored] = useState(() => loadGames(store))
  const [recent, setRecent] = useState(stored.recent)
  const { route, open, replace, back } = useRoute((pathname, revisit) =>
    startRoute(pathname, stored.current, revisit),
  )
  // The open game is the game of the address.
  const current = codeOfRoute(route)

  useEffect(() => saveSettings(store, settings), [store, settings])
  useEffect(
    () => saveGames(store, { current, recent }),
    [store, current, recent],
  )
  useEffect(() => {
    // A click is a user gesture on every browser, including iPad Safari.
    document.addEventListener('click', unlockAudio)
    return () => document.removeEventListener('click', unlockAudio)
  }, [])

  const onSeen = useCallback(
    (game: RecentGame) => setRecent((r) => seeGame(r, game)),
    [],
  )
  const home = () => back(HOME)
  const newGame = () => open(SETUP)

  const screen = (() => {
    switch (route.screen) {
      case 'join':
      case 'game': {
        const { code } = route
        return (
          <RoomScreen
            key={code}
            route={route}
            token={token}
            settings={settings}
            onSettings={setSettings}
            onSeen={onSeen}
            onPanel={(panel) => open({ screen: 'game', code, panel })}
            onBack={(panel) => back({ screen: 'game', code, panel })}
            onSettle={replace}
            onHome={home}
            onLeave={() => {
              setRecent((r) => leaveGame(r, code))
              home()
            }}
            onNewGame={newGame}
          />
        )
      }
      case 'setup':
        return (
          <SetupRoute
            token={token}
            settings={settings}
            onSettingsChange={setSettings}
            onSettings={() => open({ screen: 'setup', settings: true })}
            onBack={home}
            // A game that this device created is a recent game at once, so
            // that its code stays on Home also when the socket cannot
            // connect. Back from its claim screen skips the used setup.
            onOpen={(code, created) => {
              setRecent((r) => seeGame(r, created))
              replace({ screen: 'join', code })
            }}
          />
        )
      case 'home':
        return (
          <HomeRoute
            recent={recent}
            onNewGame={newGame}
            onSettings={() => open({ screen: 'home', settings: true })}
            onJoin={(code) => open({ screen: 'join', code })}
            onOpen={(code) => open({ screen: 'game', code, panel: null })}
          />
        )
    }
  })()

  return (
    <Stage>
      {screen}
      {(route.screen === 'home' || route.screen === 'setup') &&
        route.settings && (
          <SettingsScreen
            settings={settings}
            onChange={setSettings}
            limits={settings}
            onLimits={(limits) => setSettings((s) => ({ ...s, ...limits }))}
            beforeGame
            onClose={() => back({ ...route, settings: false })}
          />
        )}
    </Stage>
  )
}
