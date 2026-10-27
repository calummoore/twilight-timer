import { useState } from 'react'
import { cleanName, isDefaultName } from '../../model/seats'
import type { Expansions } from '../../model/settings'
import type { Seat, SeatValues } from '../../model/types'
import { Dialog, Toggle } from '../controls'
import { sameValues, seatProblem, valuesOf } from '../seatText'
import { SeatFields } from './SeatFields'

/**
 * The dialog of one seat, with the fields of a setup row. From Players &
 * devices it edits the seat, with Save, and before Start game on an admin
 * device the speaker token. From the claim screen it takes the seat, with
 * Take seat. A seat that still has the default name of Setup starts with an
 * empty name field and the default as its hint, and an empty field keeps
 * the default.
 */
export function SeatEditDialog(props: {
  kind: 'edit' | 'claim'
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
  const { seat, kind } = props
  const hint = isDefaultName(seat.name) ? seat.name : null
  const [values, setValues] = useState<SeatValues>(() => ({
    ...valuesOf(seat),
    name: hint === null ? seat.name : '',
  }))
  const [speaker, setSpeaker] = useState(props.speaker)
  // An empty field keeps the default name.
  const saved: SeatValues = {
    ...values,
    name: cleanName(values.name) ?? hint ?? '',
  }
  const problem =
    seatProblem(props.seats, seat, saved, props.takes) ??
    (kind === 'claim' && !props.started && saved.factionId === null
      ? 'Pick a faction to take the seat.'
      : null)
  const gives = speaker && !props.speaker
  const changed = kind === 'claim' || !sameValues(seat, saved) || gives

  return (
    <Dialog
      title={`${seat.name}’s seat`}
      content={
        <>
          <SeatFields
            seat={seat}
            seats={props.seats}
            values={values}
            hint={hint}
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
        label: kind === 'claim' ? 'TAKE SEAT' : 'Save',
        disabled: !props.connected || problem !== null || !changed,
        onConfirm: () => props.onSave(saved, gives),
      }}
      onCancel={props.onCancel}
    >
      {props.started
        ? `Seat ${props.place}. Only the name changes after Start game.`
        : kind === 'claim'
          ? `Seat ${props.place}. Check the name, the colour, and the faction, then take the seat.`
          : props.takes
            ? `Seat ${props.place}. A colour or a faction that another seat holds moves here, and that seat picks again.`
            : `Seat ${props.place}. Pick a colour and a faction that no other seat holds.`}
    </Dialog>
  )
}
