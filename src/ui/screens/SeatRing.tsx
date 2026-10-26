import type { MouseEvent } from 'react'
import type { Departure, Game, Player } from '../../model/types'
import { pc } from '../colour'
import { usePending } from '../hooks'
import { useSwapDrag } from '../useSwapDrag'

// The seats sit on an ellipse inside a 500 by 410 box. Positions are in
// percent, so that the ring scales with the screen.
const W = 500
const H = 410
const CX = 250
const CY = 205
const RX = 190
const RY = 150

/** A press this long on a seat starts re-order mode, as on the iOS home screen. */
const HOLD_MS = 500

/** Re-order mode, with the seat that a tap chose, or null. */
export interface Reorder {
  chosenId: string | null
}

/**
 * The table ring. Outside re-order mode, a tap on a seat moves the speaker
 * token, and a long press starts the mode. In the mode, every seat of a
 * player in the game shakes, and a drop on another seat or a tap on two seats
 * swaps the two players. A player who left keeps an empty seat, so the other
 * seats keep their places.
 */
export function SeatRing(props: {
  /** Every player, also those who left, in ring order. */
  players: Player[]
  seated: string[]
  departures: Departure[]
  speakerId: string
  /** The game of the latest state message, which ends a swap that waits. */
  received: Game
  /** Re-order mode, or null outside it. */
  reorder: Reorder | null
  /** Whether this device may swap seats now. */
  canReorder: boolean
  /** Whether this device may hand the speaker token to the player. */
  maySpeaker: (playerId: string) => boolean
  onSpeaker: (playerId: string) => void
  onReorder: (reorder: Reorder | null) => void
  onSwap: (playerId: string, otherId: string) => void
}) {
  const { reorder } = props
  // The swap shows at once, until the next state of the game arrives.
  const [sent, setSent] = usePending<[string, string]>(props.received)
  const leftIn = new Map(props.departures.map((d) => [d.playerId, d.round]))
  const speaker = props.players.find((p) => p.id === props.speakerId)
  const players = sent ? swapped(props.players, sent) : props.players
  const chosenId =
    reorder?.chosenId && props.seated.includes(reorder.chosenId)
      ? reorder.chosenId
      : null

  const swap = (playerId: string, otherId: string) => {
    // A drop after the device lost its right, or its connection, does nothing.
    if (!props.canReorder) return
    props.onReorder({ chosenId: null })
    setSent([playerId, otherId])
    props.onSwap(playerId, otherId)
  }
  const drag = useSwapDrag({
    holdMs: reorder ? null : HOLD_MS,
    canDrag: (id) =>
      props.canReorder && props.seated.length > 1 && props.seated.includes(id),
    onHold: () => props.onReorder({ chosenId: null }),
    onDrop: swap,
  })

  const tap = (id: string) => {
    if (!reorder) props.onSpeaker(id)
    else if (chosenId === null) props.onReorder({ chosenId: id })
    else if (chosenId === id) props.onReorder({ chosenId: null })
    else swap(chosenId, id)
  }
  // A tap on the ring outside the seats ends re-order mode.
  const tapRing = (e: MouseEvent<HTMLElement>) => {
    const onSeat = e.target instanceof Element && e.target.closest('.seatnode')
    if (reorder && !onSeat) props.onReorder(null)
  }

  return (
    <div style={{ padding: '18px 0 8px' }} onClick={tapRing} {...drag.scope}>
      <div className={`ringwrap ${reorder ? 'reorder' : ''}`}>
        <div className="cc">
          <div className="l">Speaker</div>
          <div className="v">★ {speaker?.name}</div>
          <div className="s">
            Picks first in the strategy phase. <br />
            Votes last, and breaks ties.
          </div>
        </div>
        {players.map((p, i) => {
          const angle = ((-90 + (i * 360) / players.length) * Math.PI) / 180
          const isSpeaker = p.id === props.speakerId
          const left = leftIn.get(p.id)
          const held = drag.heldId === p.id || chosenId === p.id
          const shift = drag.shift(p.id)
          return (
            <button
              key={p.id}
              className={`seatnode ${isSpeaker ? 'isspk' : ''} ${left === undefined ? '' : 'out'} ${held ? 'held' : ''}`}
              data-swap-id={left === undefined ? p.id : undefined}
              style={{
                ...pc(p.colour),
                left: `${((CX + RX * Math.cos(angle)) / W) * 100}%`,
                top: `${((CY + RY * Math.sin(angle)) / H) * 100}%`,
                translate: shift ? `${shift.x}px ${shift.y}px` : undefined,
              }}
              disabled={
                left !== undefined || (!reorder && !props.maySpeaker(p.id))
              }
              aria-pressed={reorder ? chosenId === p.id : undefined}
              onPointerDown={(e) => drag.press(p.id, e)}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => tap(p.id)}
            >
              {isSpeaker && <span className="tok">★</span>}
              <i />
              <div className="nm">{p.name}</div>
              <div className="sn2">
                {left === undefined ? `Seat ${i + 1}` : `Left · round ${left}`}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The players with the two seats of `pair` swapped. */
function swapped(players: Player[], [a, b]: [string, string]): Player[] {
  const at = (id: string) => players.find((p) => p.id === id)
  return players.map((p) =>
    p.id === a ? (at(b) ?? p) : p.id === b ? (at(a) ?? p) : p,
  )
}
