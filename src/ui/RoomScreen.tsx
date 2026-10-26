import { useEffect, useState } from 'react'
import type { RecentGame } from '../model/device-store'
import type { Command } from '../model/protocol'
import type { LimitSettings, Settings } from '../model/settings'
import { gameSummary } from '../model/summary'
import { GameScreen } from './GameScreen'
import { OpeningScreen } from './screens/OpeningScreen'
import { PlayersScreen } from './screens/PlayersScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { useGameClient } from './useGameClient'

/**
 * One game on the server, under its code: the opening line, the lobby, or
 * the running game, with Players & devices over it.
 */
export function RoomScreen(props: {
  code: string
  token: string
  settings: Settings
  onSettings: (settings: Settings) => void
  /** The device saw the game, so it moves to the top of the recent games. */
  onSeen: (game: RecentGame) => void
  onHome: () => void
  onLeave: () => void
  onNewGame: () => void
}) {
  const { status, room, you, offset, send } = useGameClient(
    props.code,
    props.token,
  )
  const [overlay, setOverlay] = useState<'players' | 'settings' | null>(null)
  const connected = status === 'open'
  const device = room?.devices.find((d) => d.id === you)
  const admin = connected && !!device?.admin

  const { code, onSeen } = props
  const players = room?.setup.players.length
  const game = room?.game ?? null
  useEffect(() => {
    if (players === undefined) return
    onSeen({ code, ...gameSummary(game, players), seenAt: Date.now() })
  }, [code, game, players, onSeen])

  // A device joins as a table device, which is a viewer until an admin
  // device gives it admin.
  useEffect(() => {
    if (connected && room && you === null) send({ type: 'claim', seat: null })
  }, [connected, room, you, send])

  if (status === 'missing') {
    return <OpeningScreen code={props.code} missing onHome={props.onHome} />
  }
  if (!room || !device) {
    return (
      <OpeningScreen code={props.code} missing={false} onHome={props.onHome} />
    )
  }

  // An admin device changes the limits of the game, and keeps them for its
  // next setup.
  const onLimits = (limits: LimitSettings) => {
    send({ type: 'limits', ...limits })
    props.onSettings({ ...props.settings, ...limits })
  }
  const playersScreen = (round: number | null, onClose?: () => void) => (
    <PlayersScreen
      code={room.code}
      round={round}
      players={room.setup.players}
      devices={room.devices}
      you={you}
      connected={connected}
      admin={admin}
      onAdmin={(deviceId, on) => send(adminCommand(deviceId, on))}
      onLeave={props.onLeave}
      onStart={() => send({ type: 'start' })}
      onSettings={round === null ? () => setOverlay('settings') : undefined}
      onClose={onClose}
    />
  )

  if (!room.game) {
    return (
      <>
        {playersScreen(null)}
        {overlay === 'settings' && (
          <SettingsScreen
            settings={props.settings}
            onChange={props.onSettings}
            limits={room.setup}
            onLimits={admin ? onLimits : undefined}
            onClose={() => setOverlay(null)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <GameScreen
        game={room.game}
        offset={offset}
        settings={props.settings}
        onSettings={props.onSettings}
        send={send}
        connected={connected}
        device={device}
        onPlayers={() => setOverlay('players')}
        onNewGame={props.onNewGame}
      />
      {overlay === 'players' &&
        playersScreen(
          gameSummary(room.game, room.setup.players.length).round,
          () => setOverlay(null),
        )}
    </>
  )
}

function adminCommand(deviceId: string, admin: boolean): Command {
  return { type: 'admin', deviceId, admin }
}
