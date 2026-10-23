import { useEffect, useMemo, useState } from 'react'
import { setLimits, startGame } from './model/commands'
import type { Settings } from './model/settings'
import {
  archiveGame,
  loadGame,
  loadLastGame,
  loadSettings,
  saveGame,
  saveSettings,
  type KeyValueStore,
} from './model/storage'
import type { Game } from './model/types'
import { unlockAudio } from './ui/alarm'
import { GameScreen } from './ui/GameScreen'
import { SettingsScreen } from './ui/screens/SettingsScreen'
import { SetupScreen } from './ui/screens/SetupScreen'
import { Stage } from './ui/Stage'
import './styles/mockup/base.css'
import './styles/mockup/action.css'
import './styles/mockup/setup.css'
import './styles/mockup/strategy.css'
import './styles/mockup/reaction.css'
import './styles/mockup/phases.css'
import './styles/mockup/stats.css'
import './styles/mockup/seating.css'
import './styles/app.css'
import './styles/screens.css'
import './styles/mockup/responsive.css'

const UNREADABLE = 'The saved game could not be read. Start a new game below.'

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
      removeItem: (key) => void data.delete(key),
    }
  }
}

export function App() {
  const [store] = useState(openStore)
  const [loaded] = useState(() => loadGame(store))
  const [game, setGame] = useState<Game | null>(
    loaded.status === 'ok' ? loaded.game : null,
  )
  const [settings, setSettings] = useState(() => loadSettings(store))
  const [notice, setNotice] = useState(
    loaded.status === 'invalid' ? UNREADABLE : null,
  )
  const [setupSettings, setSetupSettings] = useState(false)
  // Re-read after a game is archived, which is when `game` becomes null.
  const canLoadLast = useMemo(
    () => game === null && loadLastGame(store).status === 'ok',
    [store, game],
  )

  useEffect(() => {
    if (game) saveGame(store, game)
  }, [store, game])
  useEffect(() => saveSettings(store, settings), [store, settings])
  useEffect(() => {
    // A click is a user gesture on every browser, including iPad Safari.
    document.addEventListener('click', unlockAudio)
    return () => document.removeEventListener('click', unlockAudio)
  }, [])

  const changeSettings = (next: Settings) => {
    setSettings(next)
    const limitsChanged =
      next.enforceLimits !== settings.enforceLimits ||
      next.limits !== settings.limits
    if (limitsChanged) {
      setGame(
        (g) => g && setLimits(g, next.enforceLimits, next.limits, Date.now()),
      )
    }
  }

  const loadLast = () => {
    const last = loadLastGame(store)
    if (last.status === 'ok') setGame(last.game)
    else setNotice('The last game could not be read.')
  }

  return (
    <Stage>
      {game ? (
        <GameScreen
          game={game}
          settings={settings}
          onGame={(fn) => setGame((g) => g && fn(g, Date.now()))}
          onSettings={changeSettings}
          onNewGame={() => {
            archiveGame(store)
            setGame(null)
          }}
        />
      ) : (
        <>
          <SetupScreen
            settings={settings}
            notice={notice}
            canLoadLast={canLoadLast}
            onDismissNotice={() => setNotice(null)}
            onLoadLast={loadLast}
            onSettings={() => setSetupSettings(true)}
            onBegin={(players, speakerId) => {
              setNotice(null)
              setGame(startGame(players, speakerId, settings, Date.now()))
            }}
          />
          {setupSettings && (
            <SettingsScreen
              settings={settings}
              onChange={changeSettings}
              onClose={() => setSetupSettings(false)}
            />
          )}
        </>
      )}
    </Stage>
  )
}
