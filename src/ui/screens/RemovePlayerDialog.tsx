import { useState } from 'react'
import { leftOf } from '../../model/orders'
import type { Player } from '../../model/types'
import { Dialog, PlayerOptions } from '../controls'

/** Removes a player who is eliminated or goes home. A second tap confirms. */
export function RemovePlayerDialog(props: {
  /** The players still in the game, in seat order. */
  players: Player[]
  speakerId: string
  onRemove: (playerId: string) => void
  onClose: () => void
}) {
  const [chosenId, setChosenId] = useState<string | null>(null)
  const chosen = props.players.find((p) => p.id === chosenId)
  // A speaker who leaves passes the token to the player on their left.
  const heirId =
    chosen?.id === props.speakerId
      ? leftOf(
          props.players.map((p) => p.id),
          chosen.id,
        )
      : undefined
  const heir = props.players.find((p) => p.id === heirId)

  return (
    <Dialog
      title="Who leaves the game?"
      content={
        <>
          <PlayerOptions
            players={props.players}
            chosenId={chosenId}
            onChoose={setChosenId}
          />
          {chosen && heir && (
            <p className="heir">
              ★ The speaker token passes to {heir.name}, on {chosen.name}’s
              left.
            </p>
          )}
        </>
      }
      confirm={{
        label: chosen ? `Remove ${chosen.name}` : 'Remove',
        danger: true,
        disabled: !chosen,
        onConfirm: () => chosen && props.onRemove(chosen.id),
      }}
      onCancel={props.onClose}
    >
      They take no more picks, turns, reactions, or votes. Their time so far
      stays in the stats.
    </Dialog>
  )
}
