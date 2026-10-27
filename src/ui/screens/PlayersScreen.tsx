import { useEffect, useState } from 'react'
import { REFRESH_MS } from '../../model/connection'
import type { DeviceView } from '../../model/protocol'
import type { Expansions } from '../../model/settings'
import type { Seat, SeatValues } from '../../model/types'
import { NetBar } from '../controls'
import { DeviceRows } from './DeviceRows'
import { JoinCode } from './JoinCode'
import { LobbyFoot } from './LobbyFoot'
import { SeatEditDialog } from './SeatEditDialog'

/**
 * The join code, its link and QR code, and the seats and devices of the
 * game. Before Start game it is the lobby, with Start game on an admin device
 * and a waiting line on every other device. Edit on a seat row opens the
 * dialog of the seat.
 */
export function PlayersScreen(props: {
  code: string
  /** The round, or null in the lobby. */
  round: number | null
  /** The seats in clockwise order, as the seat moves of the game left them. */
  players: Seat[]
  devices: DeviceView[]
  you: string | null
  connected: boolean
  /** This device is an admin. Without a connection, its controls wait. */
  admin: boolean
  /** No admin device has a connection, so a seated device may take admin. */
  adminsAway: boolean
  expansions: Expansions
  speakerId: string
  /** Whether this device may switch the admin of a device on or off now. */
  mayAdmin: (deviceId: string, admin: boolean) => boolean
  onAdmin: (deviceId: string, admin: boolean) => void
  /** Whether this device may edit the seat now. */
  mayEdit: (playerId: string) => boolean
  onEdit: (playerId: string, values: SeatValues, speaker: boolean) => void
  /** This device may move seats and deal factions now. */
  mayMove: boolean
  onMove: (playerId: string, toId: string) => void
  onDeal: () => void
  /** Asks the server for a fresh state, with the connections of now. */
  onRefresh: () => void
  onChangeSeat: () => void
  onLeave: () => void
  onStart?: () => void
  onSettings?: () => void
  onClose?: () => void
}) {
  const lobby = props.round === null
  const [editing, setEditing] = useState<string | null>(null)
  const edited = props.players.find((p) => p.id === editing)
  // The server sends no state when a device goes quiet, so this screen asks
  // for the connections of now while it is open.
  const { onRefresh } = props
  useEffect(() => {
    onRefresh()
    const timer = setInterval(onRefresh, REFRESH_MS)
    return () => clearInterval(timer)
  }, [onRefresh])

  return (
    <div className={`lay ${lobby ? '' : 'settings-screen'}`}>
      <div className="top stack">
        <div className="round">
          <b>Players &amp; devices</b> ·{' '}
          {lobby ? 'Lobby' : `Round ${props.round}`}
        </div>
        <div className="spacer" />
        <button className="ibtn" onClick={props.onChangeSeat}>
          Change seat
        </button>
        <button className="ibtn" onClick={props.onLeave}>
          Leave game
        </button>
        {props.onSettings && (
          <button
            className="ibtn"
            onClick={props.onSettings}
            aria-label="Settings"
          >
            ⚙<span className="word"> Settings</span>
          </button>
        )}
        {props.onClose && (
          <button className="ibtn" onClick={props.onClose}>
            ✕ Close
          </button>
        )}
      </div>
      {!props.connected && <NetBar />}
      <div className="content join-grid">
        <JoinCode code={props.code} />
        <div>
          {props.adminsAway && props.connected && (
            <div className="notice" role="status">
              Every admin device is away. A device with a seat can take admin
              with the switch on its row.
            </div>
          )}
          <DeviceRows
            players={props.players}
            devices={props.devices}
            you={props.you}
            mayAdmin={props.mayAdmin}
            onAdmin={props.onAdmin}
            mayEdit={props.mayEdit}
            onEdit={setEditing}
            mayMove={lobby && props.mayMove}
            onMove={props.onMove}
          />
        </div>
      </div>
      {lobby && (
        <LobbyFoot
          players={props.players}
          admin={props.admin}
          connected={props.connected}
          onStart={() => props.onStart?.()}
          onDeal={props.onDeal}
        />
      )}
      {edited && (
        <SeatEditDialog
          key={edited.id}
          seat={edited}
          seats={props.players}
          place={props.players.indexOf(edited) + 1}
          expansions={props.expansions}
          takes={props.admin}
          started={!lobby}
          speaker={edited.id === props.speakerId}
          maySpeaker={lobby && props.admin}
          connected={props.connected}
          onSave={(values, speaker) => {
            props.onEdit(edited.id, values, speaker)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
