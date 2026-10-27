import { useEffect } from 'react'
import { REFRESH_MS } from '../../model/connection'
import type { DeviceView } from '../../model/protocol'
import type { Seat } from '../../model/types'
import { NetBar } from '../controls'
import { DeviceRows } from './DeviceRows'
import { JoinCode } from './JoinCode'

/**
 * The join code, its link and QR code, and the seats and devices of the
 * game. Before Start game it is the lobby, with Start game on an admin device
 * and a waiting line on every other device.
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
  /** Whether this device may switch the admin of a device on or off now. */
  mayAdmin: (deviceId: string, admin: boolean) => boolean
  onAdmin: (deviceId: string, admin: boolean) => void
  /** Asks the server for a fresh state, with the connections of now. */
  onRefresh: () => void
  onChangeSeat: () => void
  onLeave: () => void
  onStart?: () => void
  onSettings?: () => void
  onClose?: () => void
}) {
  const lobby = props.round === null
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
          />
        </div>
      </div>
      {lobby && (
        <div className="foot">
          {props.admin ? (
            <>
              <div className="lobby-help">
                Start when everyone has a seat, or start now. A phone can still
                join later, and an admin device acts for a seat without one.
              </div>
              <button
                className="big"
                disabled={!props.connected}
                onClick={props.onStart}
              >
                START GAME
              </button>
            </>
          ) : (
            <div className="lobby-wait" role="status">
              <i />
              Waiting for the table to start
            </div>
          )}
        </div>
      )}
    </div>
  )
}
