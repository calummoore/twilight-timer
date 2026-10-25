import type { Player } from '../../model/types'
import { pc } from '../colour'

const TITLE = 'Who has the Naalu 0 token?'

/** Moves the Naalu "0" token for this round, for Gift of Prescience. */
export function NaaluTokenPicker(props: {
  players: Player[]
  ownerName: string
  holderId: string | null
  onPick: (playerId: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="overlay ask"
      role="dialog"
      aria-modal="true"
      aria-label={TITLE}
    >
      <div className="dialog">
        <h3>{TITLE}</h3>
        <p>
          Move it when a player plays Gift of Prescience. The holder goes first
          this round, and the token returns to {props.ownerName} next round.
        </p>
        <div className="tokopts">
          {props.players.map((p) => {
            const holds = p.id === props.holderId
            return (
              <button
                key={p.id}
                className={`tokopt ${holds ? 'on' : ''}`}
                style={pc(p.colour)}
                onClick={() => (holds ? props.onClose() : props.onPick(p.id))}
              >
                <i />
                {p.name}
                {holds && <span className="tag">0 token</span>}
              </button>
            )
          })}
        </div>
        <div className="btns">
          <button className="ibtn" onClick={props.onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
