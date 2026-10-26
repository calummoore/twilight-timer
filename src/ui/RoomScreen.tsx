import { useEffect, useMemo } from 'react'
import type { RecentGame } from '../model/device-store'
import { NOTICES, type Command } from '../model/protocol'
import { ringOf } from '../model/ring'
import { mayCommand } from '../model/rights'
import {
  routePath,
  settleRoute,
  type GamePanel,
  type GameRoute,
} from '../model/routes'
import type { LimitSettings, Settings } from '../model/settings'
import { gameSummary } from '../model/summary'
import { GameScreen } from './GameScreen'
import { ClaimScreen } from './screens/ClaimScreen'
import { OpeningScreen } from './screens/OpeningScreen'
import { PlayersScreen } from './screens/PlayersScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { useGameClient } from './useGameClient'

/**
 * One game on the server, under its code: the opening line, the claim screen
 * of a device that has not joined, the lobby, or the running game, with
 * Players & devices over it. The address names the panel over the game.
 */
export function RoomScreen(props: {
  route: GameRoute
  token: string
  settings: Settings
  onSettings: (settings: Settings) => void
  /** The device saw the game, so it moves to the top of the recent games. */
  onSeen: (game: RecentGame) => void
  /** Opens a panel over the game. */
  onPanel: (panel: GamePanel) => void
  /** Returns to the panel under this one, or to the game with null. */
  onBack: (panel: GamePanel | null) => void
  /** Shows the route that the address settles on, in place of the address. */
  onSettle: (route: GameRoute) => void
  onHome: () => void
  onLeave: () => void
  onNewGame: () => void
}) {
  const { code } = props.route
  const { status, room, you, creator, offset, refresh, send } = useGameClient(
    code,
    props.token,
  )
  const connected = status === 'open'
  const device = room?.devices.find((d) => d.id === you)
  const admin = connected && !!device?.admin
  const joined = !!device
  const game = room?.game ?? null
  const seats = room?.setup.players.length
  const summary = useMemo(
    () => (seats === undefined ? null : gameSummary(game, seats)),
    [game, seats],
  )

  // Once the device has the game, the address shows the claim screen until
  // the device joins, then the game, with the panels of its stage.
  const { route: asked, onSeen, onSettle } = props
  const route = useMemo(
    () => (summary ? settleRoute(asked, joined, summary.phase) : asked),
    [asked, joined, summary],
  )
  useEffect(() => {
    if (routePath(route) !== routePath(asked)) onSettle(route)
  }, [route, asked, onSettle])

  // A game is a recent game of the device once the device joined it.
  useEffect(() => {
    if (!joined || !summary) return
    onSeen({ code, ...summary, seenAt: Date.now() })
  }, [code, joined, summary, onSeen])

  // A notice of the server ends the connection. The game stays in the recent
  // games of the device.
  const notice = NOTICES.find((n) => n === status) ?? null
  if (notice || !room || !summary) {
    return (
      <OpeningScreen
        code={code}
        notice={notice}
        onHome={props.onHome}
        onReload={() => location.reload()}
      />
    )
  }
  // The seats in clockwise order: the setup in the lobby, then the ring of the
  // game, which seat moves change.
  const seatOrder = room.game ? ringOf(room.game) : room.setup.players

  const panel = route.screen === 'game' ? route.panel : null
  // Change seat opens over Players & devices, which is the lobby before the
  // start.
  const backFromSeat = () => props.onBack(room.game ? 'players' : null)
  // Takes a seat, or makes this device a table device with null. The device
  // that created the game joins with admin.
  const claim = (
    <ClaimScreen
      code={room.code}
      players={seatOrder}
      devices={room.devices}
      device={device}
      admin={device ? device.admin : creator}
      connected={connected}
      onSeat={(seat) => {
        send({ type: 'claim', seat })
        if (device) backFromSeat()
      }}
      onCancel={device ? backFromSeat : props.onHome}
    />
  )
  if (!device) return claim

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
      players={seatOrder}
      devices={room.devices}
      you={you}
      connected={connected}
      admin={!!device?.admin}
      adminsAway={away}
      mayAdmin={mayAdmin}
      onAdmin={(deviceId, on) => send(adminCommand(deviceId, on))}
      onRefresh={refresh}
      onChangeSeat={() => props.onPanel('seat')}
      onLeave={props.onLeave}
      onStart={() => send({ type: 'start' })}
      onSettings={round === null ? () => props.onPanel('settings') : undefined}
      onClose={onClose}
    />
  )

  if (!room.game) {
    return (
      <>
        {playersScreen(null)}
        {panel === 'settings' && (
          <SettingsScreen
            settings={props.settings}
            onChange={props.onSettings}
            limits={room.setup}
            onLimits={admin ? onLimits : undefined}
            onClose={() => props.onBack(null)}
          />
        )}
        {panel === 'seat' && claim}
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
        panel={panel}
        onPanel={props.onPanel}
        onClosePanel={() => props.onBack(null)}
        onNewGame={props.onNewGame}
      />
      {panel === 'players' &&
        playersScreen(summary.round, () => props.onBack(null))}
      {panel === 'seat' && claim}
    </>
  )
}

function adminCommand(deviceId: string, admin: boolean): Command {
  return { type: 'admin', deviceId, admin }
}
