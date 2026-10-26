import { QRCodeSVG } from 'qrcode.react'
import { joinPath } from '../../model/code'
import type { DeviceView } from '../../model/protocol'
import type { Player } from '../../model/types'
import { NetBar } from '../controls'
import { DeviceRows } from './DeviceRows'

/**
 * The join code, its link and QR code, and the seats and devices of the
 * game. Before Start game it is the lobby, with Start game on an admin device
 * and a waiting line on every other device.
 */
export function PlayersScreen(props: {
  code: string
  /** The round, or null in the lobby. */
  round: number | null
  players: Player[]
  devices: DeviceView[]
  you: string | null
  connected: boolean
  /** This device is an admin with a connection. */
  admin: boolean
  onAdmin: (deviceId: string, admin: boolean) => void
  onLeave: () => void
  onStart?: () => void
  onSettings?: () => void
  onClose?: () => void
}) {
  const lobby = props.round === null
  const link = `${location.host}${joinPath(props.code)}`

  return (
    <div className={`lay ${lobby ? '' : 'settings-screen'}`}>
      <div className="top stack">
        <div className="round">
          <b>Players &amp; devices</b> ·{' '}
          {lobby ? 'Lobby' : `Round ${props.round}`}
        </div>
        <div className="spacer" />
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
        <div style={{ textAlign: 'center' }}>
          <div className="qr" style={{ margin: '0 auto' }}>
            <QRCodeSVG
              value={`${location.origin}${joinPath(props.code)}`}
              title={`Join link of game ${props.code}`}
            />
          </div>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--faint)',
              marginTop: 22,
            }}
          >
            Join code
          </div>
          <div className="joincode num">{props.code}</div>
          <div className="joinlink">
            Scan the code, or open <b>{link}</b>
          </div>
        </div>
        <DeviceRows
          players={props.players}
          devices={props.devices}
          you={props.you}
          admin={props.admin}
          onAdmin={props.onAdmin}
        />
      </div>
      {lobby && (
        <div className="foot">
          {props.admin ? (
            <>
              <div className="lobby-help">
                Start when everyone has a seat, or start now. A phone can still
                join later, and the table device acts for a seat without one.
              </div>
              <button className="big" onClick={props.onStart}>
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
