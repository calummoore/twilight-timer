import { useCallback, useEffect, useState } from 'react'
import { codeOfPath, joinPath } from './model/code'
import {
  closeGame,
  leaveGame,
  loadGames,
  loadToken,
  openGame,
  saveGames,
  seeGame,
  type RecentGame,
} from './model/device-store'
import { loadSettings, saveSettings, type KeyValueStore } from './model/storage'
import { unlockAudio } from './ui/alarm'
import { HomeRoute } from './ui/HomeRoute'
import { RoomScreen } from './ui/RoomScreen'
import { SettingsScreen } from './ui/screens/SettingsScreen'
import { SetupRoute } from './ui/SetupRoute'
import { Stage } from './ui/Stage'
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

type Screen =
  { name: 'home' } | { name: 'setup' } | { name: 'room'; code: string }

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
 * The app: Home, the setup of a new game, and the game of one code. A join
 * link opens its game, and a reload returns to the open game.
 */
export function App() {
  const [store] = useState(openStore)
  const [token] = useState(() => loadToken(store, makeToken))
  const [settings, setSettings] = useState(() => loadSettings(store))
  const [games, setGames] = useState(() => {
    const linked = codeOfPath(location.pathname)
    const stored = loadGames(store)
    return linked ? openGame(stored, linked) : stored
  })
  const [screen, setScreen] = useState<Screen>(() =>
    games.current ? { name: 'room', code: games.current } : { name: 'home' },
  )
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => saveSettings(store, settings), [store, settings])
  useEffect(() => saveGames(store, games), [store, games])
  // The address of an open game is its join link.
  useEffect(() => {
    const path = screen.name === 'room' ? joinPath(screen.code) : '/'
    if (location.pathname !== path) history.replaceState(null, '', path)
  }, [screen])
  useEffect(() => {
    // A click is a user gesture on every browser, including iPad Safari.
    document.addEventListener('click', unlockAudio)
    return () => document.removeEventListener('click', unlockAudio)
  }, [])

  // A game that this device created is a recent game at once, so that its
  // code stays on Home also when the socket cannot connect.
  const open = (code: string, created?: RecentGame) => {
    setGames((g) => openGame(created ? seeGame(g, created) : g, code))
    setScreen({ name: 'room', code })
  }
  const show = (next: Screen) => {
    setGames(closeGame)
    setScreen(next)
  }
  const onSeen = useCallback(
    (game: RecentGame) => setGames((g) => seeGame(g, game)),
    [],
  )

  return (
    <Stage>
      {screen.name === 'room' ? (
        <RoomScreen
          key={screen.code}
          code={screen.code}
          token={token}
          settings={settings}
          onSettings={setSettings}
          onSeen={onSeen}
          onHome={() => show({ name: 'home' })}
          onLeave={() => {
            setGames((g) => leaveGame(g, screen.code))
            setScreen({ name: 'home' })
          }}
          onNewGame={() => show({ name: 'setup' })}
        />
      ) : screen.name === 'setup' ? (
        <SetupRoute
          token={token}
          settings={settings}
          onSettingsChange={setSettings}
          onSettings={() => setSettingsOpen(true)}
          onBack={() => show({ name: 'home' })}
          onOpen={open}
        />
      ) : (
        <HomeRoute
          recent={games.recent}
          onNewGame={() => show({ name: 'setup' })}
          onSettings={() => setSettingsOpen(true)}
          onOpen={open}
        />
      )}
      {settingsOpen && screen.name !== 'room' && (
        <SettingsScreen
          settings={settings}
          onChange={setSettings}
          limits={settings}
          onLimits={(limits) => setSettings((s) => ({ ...s, ...limits }))}
          beforeGame
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </Stage>
  )
}
