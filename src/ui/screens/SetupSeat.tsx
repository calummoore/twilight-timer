import { factionChoices } from '../../model/deal'
import { factionName, isFactionId, type FactionId } from '../../model/factions'
import { COLOURS, type Colour } from '../../model/rules'
import type { Expansions } from '../../model/settings'
import { pc } from '../colour'

/** One seat of the setup screen, before the game begins. */
export interface SeatRow {
  name: string
  colour: Colour
  factionId: FactionId | null
}

/**
 * One seat row: the move buttons, the colour swatches, the name, the faction,
 * and the speaker button. The faction list offers the factions in play, and
 * the faction that the seat holds.
 */
export function SetupSeat(props: {
  index: number
  row: SeatRow
  last: boolean
  speaker: boolean
  expansions: Expansions
  onMove: (by: number) => void
  onColour: (colour: Colour) => void
  onName: (name: string) => void
  onFaction: (factionId: FactionId | null) => void
  onSpeaker: () => void
}) {
  const { index, row } = props
  return (
    <div className={`seat ${props.speaker ? 'sp' : ''}`} style={pc(row.colour)}>
      <div className="seat-move">
        <button
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => props.onMove(-1)}
        >
          ▲
        </button>
        <button
          aria-label="Move down"
          disabled={props.last}
          onClick={() => props.onMove(1)}
        >
          ▼
        </button>
      </div>
      <div className="sn">
        Seat
        <br />
        {index + 1}
      </div>
      <div className="swatches">
        {COLOURS.map((colour) => (
          <button
            key={colour}
            aria-label={colour}
            className={`sw ${colour === row.colour ? 'on' : ''}`}
            style={pc(colour)}
            onClick={() => props.onColour(colour)}
          />
        ))}
      </div>
      <input
        className="fld name"
        value={row.name}
        placeholder={`Player ${index + 1}`}
        onChange={(e) => props.onName(e.target.value)}
      />
      <select
        className={`fld sel fac ${row.factionId ? '' : 'none'}`}
        aria-label="Faction"
        value={row.factionId ?? ''}
        onChange={(e) => {
          const id = e.target.value
          props.onFaction(isFactionId(id) ? id : null)
        }}
      >
        <option value="" disabled>
          Faction
        </option>
        {factionChoices(props.expansions, row.factionId).map((id) => (
          <option key={id} value={id}>
            {factionName(id)}
          </option>
        ))}
      </select>
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
