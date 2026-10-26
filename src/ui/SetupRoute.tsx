import { useState } from 'react'
import { BUILD } from '../build'
import type { RecentGame } from '../model/device-store'
import type { Settings } from '../model/settings'
import { gameSummary } from '../model/summary'
import type { Player } from '../model/types'
import { createGame } from './api'
import { checkServerBuild } from './reload'
import type { CreateFailure } from './screens/SetupGamePanel'
import { SetupScreen } from './screens/SetupScreen'

/** The setup of a new game. Create game puts the seats on the server. */
export function SetupRoute(props: {
  token: string
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  onSettings: () => void
  onBack: () => void
  /** Opens the new game, by its code, as a recent game of this device. */
  onOpen: (code: string, created: RecentGame) => void
}) {
  const [creating, setCreating] = useState(false)
  const [failure, setFailure] = useState<CreateFailure | null>(null)
  const { enforceLimits, limits } = props.settings

  const create = async (players: Player[], speakerId: string) => {
    setCreating(true)
    const setup = { players, speakerId, enforceLimits, limits }
    const created = await createGame({
      token: props.token,
      build: BUILD,
      setup,
    })
    if (!('code' in created)) {
      // A server of another build cannot read the setup of this page, so the
      // page reloads once to get the build of the server.
      const check =
        created.error === 'outdated' ? checkServerBuild(created.build) : null
      if (check === 'reload') return
      setCreating(false)
      setFailure(check === 'outdated' ? 'outdated' : 'offline')
      return
    }
    setCreating(false)
    setFailure(null)
    const summary = gameSummary(null, players.length)
    props.onOpen(created.code, {
      code: created.code,
      ...summary,
      seenAt: Date.now(),
    })
  }

  return (
    <SetupScreen
      settings={props.settings}
      creating={creating}
      failure={failure}
      onReload={() => location.reload()}
      onBack={props.onBack}
      onSettings={props.onSettings}
      onSettingsChange={props.onSettingsChange}
      onCreate={(players, speakerId) => void create(players, speakerId)}
    />
  )
}
