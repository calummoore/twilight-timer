import type { Player } from '../../model/types'
import { pc } from '../colour'

// The seats sit on an ellipse inside a 500 by 410 box. Positions are in
// percent, so that the ring scales with the screen.
const W = 500
const H = 410
const CX = 250
const CY = 205
const RX = 190
const RY = 150

/** The table ring. Tapping a seat moves the speaker token there. */
export function SeatingScreen(props: {
  round: number
  players: Player[]
  speakerId: string
  pickOrder: string[]
  voteOrder: string[]
  canUndo: boolean
  onSpeaker: (playerId: string) => void
  onUndo: () => void
  onClose: () => void
}) {
  const byId = new Map(props.players.map((p) => [p.id, p]))
  const speaker = byId.get(props.speakerId)
  const n = props.players.length

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
              tap a seat to move the speaker token
            </span>
          </div>
          <div style={{ padding: '18px 0 8px' }}>
            <div className="ringwrap">
              <div className="cc">
                <div className="l">Speaker</div>
                <div className="v">★ {speaker?.name}</div>
                <div className="s">
                  Picks first in the strategy phase. <br />
                  Votes last, and breaks ties.
                </div>
              </div>
              {props.players.map((p, i) => {
                const angle = ((-90 + (i * 360) / n) * Math.PI) / 180
                const isSpeaker = p.id === props.speakerId
                return (
                  <button
                    key={p.id}
                    className={`seatnode ${isSpeaker ? 'isspk' : ''}`}
                    style={{
                      ...pc(p.colour),
                      left: `${((CX + RX * Math.cos(angle)) / W) * 100}%`,
                      top: `${((CY + RY * Math.sin(angle)) / H) * 100}%`,
                    }}
                    onClick={() => props.onSpeaker(p.id)}
                  >
                    {isSpeaker && <span className="tok">★</span>}
                    <i />
                    <div className="nm">{p.name}</div>
                    <div className="sn2">Seat {i + 1}</div>
                  </button>
                )
              })}
            </div>
          </div>
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
        </div>
      </div>
    </div>
  )
}
