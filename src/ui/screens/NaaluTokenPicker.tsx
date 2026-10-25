import type { Player } from '../../model/types'
import { Dialog, PlayerOptions } from '../controls'

/** Moves the Naalu "0" token for this round, for Gift of Prescience. */
export function NaaluTokenPicker(props: {
  players: Player[]
  ownerName: string
  holderId: string | null
  onPick: (playerId: string) => void
  onClose: () => void
}) {
  return (
    <Dialog
      title="Who has the Naalu 0 token?"
      content={
        <PlayerOptions
          players={props.players}
          chosenId={props.holderId}
          tag="0 token"
          onChoose={(id) =>
            id === props.holderId ? props.onClose() : props.onPick(id)
          }
        />
      }
      onCancel={props.onClose}
    >
      Move it when a player plays Gift of Prescience. The holder goes first this
      round, and the token returns to {props.ownerName} next round.
    </Dialog>
  )
}
