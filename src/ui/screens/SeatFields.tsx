import { factionChoices } from '../../model/deal'
import { factionName, isFactionId, type FactionId } from '../../model/factions'
import { COLOURS, type Colour } from '../../model/rules'
import { colourHolder, factionHolder } from '../../model/seats'
import type { Expansions } from '../../model/settings'
import type { Seat, SeatValues } from '../../model/types'
import { pc } from '../colour'
import { colourName } from '../seatText'

/**
 * The colour swatches of a seat. A colour that `taken` gives a holder for is
 * off, and names the holder, so a device that may not take it sees why.
 */
export function ColourSwatches(props: {
  colour: Colour
  taken?: (colour: Colour) => Seat | undefined
  onChange: (colour: Colour) => void
}) {
  return (
    <div className="swatches">
      {COLOURS.map((colour) => {
        const holder = props.taken?.(colour)
        return (
          <button
            key={colour}
            aria-label={holder ? `${colour}, ${holder.name}` : colour}
            title={
              holder ? `${colourName(colour)} · ${holder.name}` : undefined
            }
            className={`sw ${colour === props.colour ? 'on' : ''} ${holder ? 'taken' : ''}`}
            style={pc(colour)}
            disabled={!!holder}
            onClick={() => props.onChange(colour)}
          />
        )
      })}
    </div>
  )
}

/**
 * The faction list of a seat: the factions in play, and the faction that the
 * seat holds. A faction that `taken` gives a holder for is off, and names
 * the holder.
 */
export function FactionSelect(props: {
  factionId: FactionId | null
  expansions: Expansions
  taken?: (factionId: FactionId) => Seat | undefined
  onChange: (factionId: FactionId | null) => void
}) {
  return (
    <select
      className={`fld sel fac ${props.factionId ? '' : 'none'}`}
      aria-label="Faction"
      value={props.factionId ?? ''}
      onChange={(e) => {
        const id = e.target.value
        props.onChange(isFactionId(id) ? id : null)
      }}
    >
      <option value="" disabled>
        Faction
      </option>
      {factionChoices(props.expansions, props.factionId).map((id) => {
        const holder = props.taken?.(id)
        return (
          <option key={id} value={id} disabled={!!holder}>
            {factionName(id)}
            {holder ? ` · ${holder.name}` : ''}
          </option>
        )
      })}
    </select>
  )
}

/**
 * The fields of a seat, one under the other: the name, the colour, and the
 * faction. A device that does not take a value sees the taken colours and
 * factions off. After Start game, the colour and the faction are fixed, so
 * they show as text.
 */
export function SeatFields(props: {
  seat: Seat
  seats: readonly Seat[]
  values: SeatValues
  expansions: Expansions
  /** This device takes a value that another seat holds, as an admin does. */
  takes: boolean
  started: boolean
  onChange: (values: SeatValues) => void
}) {
  const { seat, seats, values } = props
  const change = (patch: Partial<SeatValues>) =>
    props.onChange({ ...values, ...patch })
  const takenColour = props.takes
    ? undefined
    : (colour: Colour) => colourHolder(seats, seat.id, colour)
  const takenFaction = props.takes
    ? undefined
    : (factionId: FactionId) => factionHolder(seats, seat.id, factionId)

  return (
    <div className="fields">
      <label className="lbl" htmlFor={`name-${seat.id}`}>
        Name
      </label>
      <input
        id={`name-${seat.id}`}
        className="fld name"
        value={values.name}
        maxLength={40}
        onChange={(e) => change({ name: e.target.value })}
      />
      <div className="lbl">Colour</div>
      {props.started ? (
        <div className="fixed">{colourName(values.colour)}</div>
      ) : (
        <ColourSwatches
          colour={values.colour}
          taken={takenColour}
          onChange={(colour) => change({ colour })}
        />
      )}
      <div className="lbl">Faction</div>
      {props.started ? (
        <div className="fixed">
          {values.factionId ? factionName(values.factionId) : 'No faction'}
        </div>
      ) : (
        <FactionSelect
          factionId={values.factionId}
          expansions={props.expansions}
          taken={takenFaction}
          onChange={(factionId) => change({ factionId })}
        />
      )}
    </div>
  )
}
