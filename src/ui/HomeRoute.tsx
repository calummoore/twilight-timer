import { useState } from 'react'
import { parseCode } from '../model/code'
import type { RecentGame } from '../model/device-store'
import {
  forgetGame,
  forgetLastGame,
  loadGame,
  loadLastGame,
  type KeyValueStore,
} from '../model/storage'
import { createGame, lookUpGame } from './api'
import { HomeScreen, type SavedGame } from './screens/HomeScreen'

const UNREACHABLE =
  'The game could not be reached. Check the connection and try again.'

/**
 * Home: a new game, a join code that the server looks up first, the games
 * that a build before the server saved, and the recent games.
 */
export function HomeRoute(props: {
  store: KeyValueStore
  token: string
  recent: RecentGame[]
  onNewGame: () => void
  onSettings: () => void
  /** Opens a game, by its code. */
  onOpen: (code: string) => void
}) {
  const { store } = props
  const [now] = useState(() => Date.now())
  const [saved, setSaved] = useState(() => savedGames(store))
  const [joinError, setJoinError] = useState<string | null>(null)
  const [savedError, setSavedError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const join = async (text: string) => {
    const typed = text.replace(/\s/g, '').toUpperCase()
    const code = parseCode(typed)
    const missing = `No game has the code ${code ?? typed}. Check the code on the table device.`
    if (!typed) return setJoinError('Enter the code from the table device.')
    if (!code) return setJoinError(missing)
    setBusy(true)
    const found = await lookUpGame(code)
    setBusy(false)
    if (found === 'found') props.onOpen(code)
    else setJoinError(found === 'missing' ? missing : UNREACHABLE)
  }

  const forget = (slot: SavedGame['slot']) => {
    if (slot === 'game') forgetGame(store)
    else forgetLastGame(store)
    setSaved(savedGames(store))
  }

  // The game gets a code on the server, and this device forgets its copy.
  const resume = async (slot: SavedGame['slot']) => {
    const game = saved.find((s) => s.slot === slot)?.game
    if (!game) return
    setBusy(true)
    const created = await createGame({ token: props.token, game })
    setBusy(false)
    if (!('code' in created)) return setSavedError(UNREACHABLE)
    forget(slot)
    props.onOpen(created.code)
  }

  return (
    <HomeScreen
      recent={props.recent}
      saved={saved}
      now={now}
      joinError={joinError}
      savedError={savedError}
      busy={busy}
      onNewGame={props.onNewGame}
      onJoin={(text) => void join(text)}
      onOpen={props.onOpen}
      onContinue={(slot) => void resume(slot)}
      onDismiss={forget}
      onSettings={props.onSettings}
    />
  )
}

/** The games that a build before the server saved on this device. */
function savedGames(store: KeyValueStore): SavedGame[] {
  const slots = [
    ['game', loadGame(store)],
    ['last', loadLastGame(store)],
  ] as const
  return slots.flatMap(([slot, loaded]) =>
    loaded.status === 'none'
      ? []
      : [{ slot, game: loaded.status === 'ok' ? loaded.game : null }],
  )
}
