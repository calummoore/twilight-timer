import { useState } from 'react'
import type { Departure, Game, Player } from '../../model/types'
import { pc } from '../colour'
import { RemovePlayerDialog } from './RemovePlayerDialog'
import { SeatRing, type Reorder } from './SeatRing'

/**
 * The table ring, and the two orders that derive from it. A tap on a seat
 * moves the speaker token there. Re-order mode moves seats, to fix a ring
 * that does not match the table.
 */
export function SeatingScreen(props: {
  round: number
  /** Every player, also those who left, in ring order. */
  players: Player[]
  seated: string[]
  departures: Departure[]
  speakerId: string
  pickOrder: string[]
  voteOrder: string[]
  /** The game of the latest state message, which ends a move that waits. */
  received: Game
  canUndo: boolean
  /** Whether this device may hand the speaker token to the player. */
  maySpeaker: (playerId: string) => boolean
  canRemove: boolean
  /** Whether this device may move seats now. */
  canReorder: boolean
  onSpeaker: (playerId: string) => void
  onMove: (playerId: string, toId: string) => void
  onRemove: (playerId: string) => void
  onUndo: () => void
  onClose: () => void
}) {
  const [removing, setRemoving] = useState(false)
  const [reorder, setReorder] = useState<Reorder | null>(null)
  // The mode ends when the device may no longer move seats.
  if (reorder && !props.canReorder) setReorder(null)
  const byId = new Map(props.players.map((p) => [p.id, p]))

  const orderList = (ids: string[]) =>
    ids.map((id, i) => {
      const p = byId.get(id)
      const isSpeaker = id === props.speakerId
      return (
        <div
          key={id}
          className={`ordrow ${isSpeaker ? 'isspk' : ''}`}
          style={pc(p?.colour)}
        >
          <div className="n2">{i + 1}</div>
          <div className="nm">
            <i />
            {p?.name}
          </div>
          {isSpeaker ? <span className="tag2">★ Speaker</span> : <span />}
        </div>
      )
    })

  return (
    <div className="lay settings-screen">
      <div className="top stack">
        <div className="round">
          <b>Speaker &amp; seating</b> · Round {props.round}
        </div>
        <div className="spacer" />
        <button
          className="ibtn"
          disabled={props.seated.length < 2 || !props.canRemove}
          onClick={() => setRemoving(true)}
        >
          Remove a player
        </button>
        <button
          className="ibtn"
          onClick={props.onUndo}
          disabled={!props.canUndo}
        >
          ↺ Undo
        </button>
        <button className="ibtn" onClick={props.onClose}>
          ✕ Close
        </button>
      </div>
      <div className="content split" style={{ '--side': '400px', gap: 20 }}>
        <div
          className="pnl"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <div className="pnl-h">
            The table
            <span className="pnl-note">
              {reorder
                ? 'drag a seat to its place'
                : 'tap a seat to move the speaker · hold to re-order'}
            </span>
          </div>
          <SeatRing
            players={props.players}
            seated={props.seated}
            departures={props.departures}
            speakerId={props.speakerId}
            received={props.received}
            reorder={reorder}
            canReorder={props.canReorder}
            maySpeaker={props.maySpeaker}
            onSpeaker={props.onSpeaker}
            onReorder={setReorder}
            onMove={props.onMove}
          />
          <div style={{ padding: '0 20px 18px', marginTop: 'auto' }}>
            <div className="note-box">
              Seats match where people sit, so “clockwise” and “to the left”
              mean the same on screen as at the table.
            </div>
          </div>
        </div>
        <div className="col scroll seat-orders" style={{ gap: 12 }}>
          <div className="pnl">
            <div className="pnl-h">Strategy pick order</div>
            <div className="ord-body">
              <div className="ordlist">{orderList(props.pickOrder)}</div>
              <div className="order-help">Speaker first, then clockwise.</div>
            </div>
          </div>
          <div className="pnl">
            <div className="pnl-h">Agenda voting order</div>
            <div className="ord-body">
              <div className="ordlist">{orderList(props.voteOrder)}</div>
              <div className="order-help">
                Starts left of the speaker. The speaker votes last.
              </div>
            </div>
          </div>
          <button
            className={`ibtn reorder ${reorder ? 'on' : ''}`}
            disabled={
              !reorder && (!props.canReorder || props.seated.length < 2)
            }
            onClick={() => setReorder(reorder ? null : { chosenId: null })}
          >
            {reorder ? '✓ Done' : '⠿ Re-order seats'}
          </button>
          <div className="order-help" style={{ textAlign: 'center' }}>
            {reorder
              ? 'Or tap a seat, then its new place. Undo takes a move back.'
              : 'Move seats when the ring does not match the table.'}
          </div>
        </div>
      </div>
      {removing && (
        <RemovePlayerDialog
          players={props.players.filter((p) => props.seated.includes(p.id))}
          speakerId={props.speakerId}
          onRemove={(playerId) => {
            setRemoving(false)
            props.onRemove(playerId)
          }}
          onClose={() => setRemoving(false)}
        />
      )}
    </div>
  )
}
