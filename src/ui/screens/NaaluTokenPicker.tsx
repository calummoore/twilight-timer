import type { Player } from '../../model/types'
import { PlayerOptions } from '../controls'

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
    <div className="overlay" role="dialog" aria-modal="true" aria-label={TITLE}>
      <div className="dialog">
        <h3>{TITLE}</h3>
        <p>
          Move it when a player plays Gift of Prescience. The holder goes first
          this round, and the token returns to {props.ownerName} next round.
        </p>
        <PlayerOptions
          players={props.players}
          chosenId={props.holderId}
          tag="0 token"
          onChoose={(id) =>
            id === props.holderId ? props.onClose() : props.onPick(id)
          }
        />
        <div className="btns">
          <button className="ibtn" onClick={props.onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
