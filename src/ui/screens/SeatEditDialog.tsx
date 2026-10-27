import { useState } from 'react'
import type { Expansions } from '../../model/settings'
import type { Seat, SeatValues } from '../../model/types'
import { Dialog, Toggle } from '../controls'
import { sameValues, seatProblem, valuesOf } from '../seatText'
import { SeatFields } from './SeatFields'

/**
 * The dialog that edits one seat: the fields of a setup row, and before
 * Start game on an admin device the speaker token. Save applies the change
 * at once on every device.
 */
export function SeatEditDialog(props: {
  seat: Seat
  seats: readonly Seat[]
  /** The place of the seat in the ring, from 1. */
  place: number
  expansions: Expansions
  /** This device takes a value that another seat holds, as an admin does. */
  takes: boolean
  started: boolean
  /** The seat holds the speaker token now. */
  speaker: boolean
  /** This device may give the seat the speaker token. */
  maySpeaker: boolean
  connected: boolean
  onSave: (values: SeatValues, speaker: boolean) => void
  onCancel: () => void
}) {
  const { seat } = props
  const [values, setValues] = useState<SeatValues>(() => valuesOf(seat))
  const [speaker, setSpeaker] = useState(props.speaker)
  const problem = seatProblem(props.seats, seat, values, props.takes)
  const gives = speaker && !props.speaker
  const changed = !sameValues(seat, values) || gives

  return (
    <Dialog
      title={`${seat.name}’s seat`}
      content={
        <>
          <SeatFields
            seat={seat}
            seats={props.seats}
            values={values}
            expansions={props.expansions}
            takes={props.takes}
            started={props.started}
            onChange={setValues}
          />
          {props.maySpeaker && (
            <div className="fields" style={{ marginTop: 14 }}>
              <div className="lbl">Speaker</div>
              <div className="spkrow">
                <span>Picks first in the strategy phase</span>
                <Toggle
                  label={`Speaker: ${seat.name}`}
                  on={speaker}
                  disabled={props.speaker}
                  onChange={setSpeaker}
                />
              </div>
            </div>
          )}
          {problem && (
            <div className="fields" style={{ marginTop: 14 }}>
              <div className="need">{problem}</div>
            </div>
          )}
        </>
      }
      confirm={{
        label: 'Save',
        disabled: !props.connected || problem !== null || !changed,
        onConfirm: () => props.onSave(values, gives),
      }}
      onCancel={props.onCancel}
    >
      {props.started
        ? `Seat ${props.place}. Only the name changes after Start game.`
        : props.takes
          ? `Seat ${props.place}. A colour or a faction that another seat holds moves here, and that seat picks again.`
          : `Seat ${props.place}. Pick a colour and a faction that no other seat holds.`}
    </Dialog>
  )
}
