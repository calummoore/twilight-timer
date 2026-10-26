import { useEffect, useState } from 'react'
import type { RecentGame } from '../model/device-store'
import { NOTICES, type Command } from '../model/protocol'
import { mayCommand } from '../model/rights'
import type { LimitSettings, Settings } from '../model/settings'
import { gameSummary } from '../model/summary'
import { GameScreen } from './GameScreen'
import { ClaimScreen } from './screens/ClaimScreen'
import { OpeningScreen } from './screens/OpeningScreen'
import { PlayersScreen } from './screens/PlayersScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { useGameClient } from './useGameClient'

/** The screens that a tap opens over the lobby or the game. */
type Overlay = 'players' | 'settings' | 'claim' | null

/**
 * One game on the server, under its code: the opening line, the claim screen
 * of a device that has not joined, the lobby, or the running game, with
 * Players & devices over it.
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
  const { status, room, you, creator, offset, refresh, send } = useGameClient(
    props.code,
    props.token,
  )
  const [overlay, setOverlay] = useState<Overlay>(null)
  const connected = status === 'open'
  const device = room?.devices.find((d) => d.id === you)
  const admin = connected && !!device?.admin

  // A game is a recent game of the device once the device joined it.
  const { code, onSeen } = props
  const players = device && room?.setup.players.length
  const game = room?.game ?? null
  useEffect(() => {
    if (players === undefined) return
    onSeen({ code, ...gameSummary(game, players), seenAt: Date.now() })
  }, [code, game, players, onSeen])

  // A notice of the server ends the connection. The game stays in the recent
  // games of the device.
  const notice = NOTICES.find((n) => n === status) ?? null
  if (notice || !room) {
    return (
      <OpeningScreen
        code={props.code}
        notice={notice}
        onHome={props.onHome}
        onReload={() => location.reload()}
      />
    )
  }

  // Takes a seat, or makes this device a table device with null. The device
  // that created the game joins with admin.
  const claim = (back: Overlay) => (
    <ClaimScreen
      code={room.code}
      players={room.setup.players}
      devices={room.devices}
      device={device}
      admin={device ? device.admin : creator}
      connected={connected}
      onSeat={(seat) => {
        send({ type: 'claim', seat })
        setOverlay(back)
      }}
      onCancel={device ? () => setOverlay(back) : props.onHome}
    />
  )
  if (!device) return claim(null)

  // An admin device changes the limits of the game, and keeps them for its
  // next setup.
  const onLimits = (limits: LimitSettings) => {
    send({ type: 'limits', ...limits })
    props.onSettings({ ...props.settings, ...limits })
  }
  // While every admin device is away, a seated device may take admin. The
  // server says when they are, and the switches ask its rule.
  const away = room.adminsAway
  const mayAdmin = (deviceId: string, on: boolean) =>
    connected && mayCommand(device, adminCommand(deviceId, on), null, away)
  const playersScreen = (round: number | null, onClose?: () => void) => (
    <PlayersScreen
      code={room.code}
      round={round}
      players={room.setup.players}
      devices={room.devices}
      you={you}
      connected={connected}
      admin={!!device?.admin}
      adminsAway={away}
      mayAdmin={mayAdmin}
      onAdmin={(deviceId, on) => send(adminCommand(deviceId, on))}
      onRefresh={refresh}
      onChangeSeat={() => setOverlay('claim')}
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
        {overlay === 'claim' && claim(null)}
      </>
    )
  }

  return (
    <>
      <GameScreen
        game={room.game}
        revision={room.revision}
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
      {overlay === 'claim' && claim('players')}
    </>
  )
}

function adminCommand(deviceId: string, admin: boolean): Command {
  return { type: 'admin', deviceId, admin }
}
