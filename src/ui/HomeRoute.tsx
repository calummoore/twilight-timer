import { useState } from 'react'
import { parseCode } from '../model/code'
import type { RecentGame } from '../model/device-store'
import { lookUpGame } from './api'
import { HomeScreen } from './screens/HomeScreen'

const UNREACHABLE =
  'The game could not be reached. Check the connection and try again.'

/**
 * Home: a new game, a join code that the server looks up first, and the
 * recent games.
 */
export function HomeRoute(props: {
  recent: RecentGame[]
  onNewGame: () => void
  onSettings: () => void
  /** Opens the claim screen of a game that the server found, by its code. */
  onJoin: (code: string) => void
  /** Opens a recent game, by its code. */
  onOpen: (code: string) => void
}) {
  const [now] = useState(() => Date.now())
  const [joinError, setJoinError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const join = async (text: string) => {
    const typed = text.replace(/\s/g, '').toUpperCase()
    const code = parseCode(typed)
    const missing = `No game has the code ${code ?? typed}. Check the code on a device in the game.`
    if (!typed) return setJoinError('Enter the code from a device in the game.')
    if (!code) return setJoinError(missing)
    setBusy(true)
    const found = await lookUpGame(code)
    setBusy(false)
    if (found === 'found') props.onJoin(code)
    else setJoinError(found === 'missing' ? missing : UNREACHABLE)
  }

  return (
    <HomeScreen
      recent={props.recent}
      now={now}
      joinError={joinError}
      busy={busy}
      onNewGame={props.onNewGame}
      onJoin={(text) => void join(text)}
      onOpen={(code) => props.onOpen(code)}
      onSettings={props.onSettings}
    />
  )
}
