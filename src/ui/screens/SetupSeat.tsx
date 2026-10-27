import type { PointerEvent } from 'react'
import type { FactionId } from '../../model/factions'
import type { Colour } from '../../model/rules'
import { defaultName } from '../../model/seats'
import type { Expansions } from '../../model/settings'
import { pc } from '../colour'
import { ColourSwatches, FactionSelect } from './SeatFields'

/**
 * One seat of the setup screen, before the game begins. A seat can be empty:
 * it has no faction yet, and the game cannot begin until it has one.
 */
export interface SeatRow {
  /** Stays with the row through every move, so React keeps its fields. */
  id: number
  name: string
  colour: Colour
  /** The faction of the seat, or null for an empty seat. */
  factionId: FactionId | null
}

/**
 * One seat row: the drag handle, the colour swatches, the name, the faction,
 * and the speaker button. The faction list offers the factions in play, and
 * the faction that the seat holds.
 */
export function SetupSeat(props: {
  index: number
  row: SeatRow
  speaker: boolean
  expansions: Expansions
  /** The row follows a drag on its handle. */
  held: boolean
  /** How far the row moves down during a drag, in px, or null. */
  shiftY: number | null
  /** A press on the handle, which can start a drag. */
  onGrip: (e: PointerEvent<HTMLElement>) => void
  onColour: (colour: Colour) => void
  onName: (name: string) => void
  onFaction: (factionId: FactionId | null) => void
  onSpeaker: () => void
}) {
  const { index, row } = props
  return (
    <div
      className={`seat ${props.speaker ? 'sp' : ''} ${props.held ? 'held' : ''}`}
      data-drag-id={index}
      style={{
        ...pc(row.colour),
        translate: props.shiftY === null ? undefined : `0 ${props.shiftY}px`,
      }}
    >
      <span className="drag" aria-hidden="true" onPointerDown={props.onGrip}>
        <i />
      </span>
      <div className="sn">
        Seat
        <br />
        {index + 1}
      </div>
      <ColourSwatches colour={row.colour} onChange={props.onColour} />
      <input
        className="fld name"
        value={row.name}
        placeholder={defaultName(index + 1)}
        onChange={(e) => props.onName(e.target.value)}
      />
      <FactionSelect
        factionId={row.factionId}
        expansions={props.expansions}
        onChange={props.onFaction}
      />
      <button
        className={`spk ${props.speaker ? 'on' : ''}`}
        aria-label="Make speaker"
        onClick={props.onSpeaker}
      >
        ★
      </button>
    </div>
  )
}
