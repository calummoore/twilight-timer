import type { FactionId } from '../../model/factions'
import type { Colour } from '../../model/rules'
import type { Expansions } from '../../model/settings'
import { listPlaces } from '../listMove'
import { useDragReorder } from '../useDragReorder'
import { SetupSeat, type SeatRow } from './SetupSeat'

/**
 * The seat rows of the setup, in seat order. A drag on the handle of a row
 * moves it to the place of another row, and the rows between shift by one.
 * The rows slide only while a drag runs, so a drop puts them in place at once.
 */
export function SetupSeatList(props: {
  seats: SeatRow[]
  /** The index of the speaker's row. */
  speaker: number
  expansions: Expansions
  onMoveRow: (from: number, to: number) => void
  onColour: (i: number, colour: Colour) => void
  onName: (i: number, name: string) => void
  onFaction: (i: number, factionId: FactionId | null) => void
  onSpeaker: (i: number) => void
}) {
  const drag = useDragReorder({
    holdMs: null,
    canDrag: () => props.seats.length > 1,
    arrange: (heldId, targetId) => listPlaces(Number(heldId), Number(targetId)),
    onDrop: (heldId, targetId) =>
      props.onMoveRow(Number(heldId), Number(targetId)),
  })
  const dragging = drag.heldId !== null

  return (
    <div
      className={`seat-list scroll grow ${dragging ? 'dragging' : ''}`}
      {...drag.scope}
    >
      {props.seats.map((row, i) => (
        <SetupSeat
          key={row.id}
          index={i}
          row={row}
          speaker={i === props.speaker}
          expansions={props.expansions}
          held={drag.heldId === String(i)}
          shiftY={drag.shift(String(i))?.y ?? null}
          onGrip={(e) => drag.press(String(i), e)}
          onColour={(colour) => props.onColour(i, colour)}
          onName={(name) => props.onName(i, name)}
          onFaction={(factionId) => props.onFaction(i, factionId)}
          onSpeaker={() => props.onSpeaker(i)}
        />
      ))}
    </div>
  )
}
