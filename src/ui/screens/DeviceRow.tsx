import type { PointerEvent } from 'react'
import type { DeviceView } from '../../model/protocol'
import type { Seat } from '../../model/types'
import { pc } from '../colour'
import { Toggle } from '../controls'
import { seatFaction } from '../seatText'

/**
 * One row of Players & devices: a seat with the device that holds it, a seat
 * without a device, or a table device. A seat row shows the speaker token,
 * has Edit when this device may edit the seat, and the drag handle when
 * this device may move it.
 */
export function DeviceRow(props: {
  /** The seat of the row, or undefined for a table device. */
  seat: Seat | undefined
  /** The device of the row, or undefined for a seat without one. */
  device: DeviceView | undefined
  you: boolean
  /** The admin switch shows, but this device may not use it. */
  locked: boolean
  onAdmin: (admin: boolean) => void
  /** The seat holds the speaker token. A table device has no token. */
  speaker?: boolean
  /** A tap gives the seat the speaker token. Without it, the token only shows. */
  onSpeaker?: () => void
  onEdit?: () => void
  /** A press on the handle, which can start a drag of the seat. */
  onGrip?: (e: PointerEvent<HTMLElement>) => void
  /** The row follows a drag on its handle. */
  held?: boolean
  /** How far the row moves down during a drag, in px, or null. */
  shiftY?: number | null
}) {
  const { seat, device } = props
  const about = seat
    ? seatFaction(seat)
    : device?.admin
      ? 'Acts for every player'
      : 'Watches the game'
  const name = seat ? seat.name : 'Table device'
  const classes = [
    'dev-row',
    seat ? '' : 'table',
    props.onGrip ? 'grip' : '',
    props.held ? 'held' : '',
  ]

  return (
    <div
      className={classes.join(' ')}
      data-drag-id={seat?.id}
      style={{
        ...(seat ? pc(seat.colour) : { '--pc': 'var(--accent)' }),
        translate:
          props.shiftY === null || props.shiftY === undefined
            ? undefined
            : `0 ${props.shiftY}px`,
      }}
    >
      {props.onGrip && (
        <span className="drag" aria-hidden="true" onPointerDown={props.onGrip}>
          <i />
        </span>
      )}
      <i />
      <div className="txt">
        <div className="nm">
          {name}
          {props.you && <span className="you-tag">This device</span>}
        </div>
        <div className="fc">
          {seat && !seat.factionId ? (
            <span className="none">{about}</span>
          ) : (
            about
          )}
        </div>
      </div>
      {seat && (
        <button
          className={`spk ${props.speaker ? 'on' : ''}`}
          aria-label={
            props.speaker
              ? `${name} is the speaker`
              : `Make ${name} the speaker`
          }
          aria-pressed={props.speaker}
          disabled={!props.onSpeaker || props.speaker}
          onClick={props.onSpeaker}
        >
          ★
        </button>
      )}
      {device ? (
        device.connected ? (
          <div className="st ok">● Connected</div>
        ) : (
          <div className="st away">Away</div>
        )
      ) : (
        <div className="st no">No device</div>
      )}
      <div className="edt">
        {props.onEdit && (
          <button
            className="ibtn edit"
            aria-label={`Edit ${name}`}
            onClick={props.onEdit}
          >
            Edit
          </button>
        )}
      </div>
      {device ? (
        <div className="adm">
          Admin
          <Toggle
            label={`Admin: ${name}`}
            on={device.admin}
            disabled={props.locked}
            onChange={props.onAdmin}
          />
        </div>
      ) : (
        <div className="adm" />
      )}
    </div>
  )
}
