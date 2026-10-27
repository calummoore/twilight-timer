import type { Seat } from '../../model/types'

/** "Jaz, Priya, and Wren", as a line names several seats. */
const LIST = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })

/**
 * The foot of the lobby: Start game on an admin device, which waits until
 * every seat has a faction, with Random factions under the line that names
 * the seats without one, and the waiting line on every other device.
 */
export function LobbyFoot(props: {
  players: Seat[]
  admin: boolean
  connected: boolean
  onStart: () => void
  onDeal: () => void
}) {
  const empty = props.players.filter((p) => p.factionId === null)
  const names = LIST.format(empty.map((p) => p.name))
  if (!props.admin) {
    return (
      <div className="foot">
        <div className="lobby-wait" role="status">
          <i />
          Waiting for the table to start
        </div>
      </div>
    )
  }
  return (
    <div className="foot">
      <div className="lobby-help">
        <div>
          {empty.length > 0 ? (
            <>
              {names} {empty.length > 1 ? 'have' : 'has'} no faction yet. Start
              when every seat has one, or deal now.
            </>
          ) : (
            <>
              Start when everyone has a seat, or start now. A phone can still
              join later, and an admin device acts for a seat without one.
            </>
          )}
        </div>
        {empty.length > 0 && (
          <button
            className="ibtn"
            disabled={!props.connected}
            onClick={props.onDeal}
          >
            Random factions
          </button>
        )}
      </div>
      <button
        className="big"
        disabled={!props.connected || empty.length > 0}
        onClick={props.onStart}
      >
        START GAME
      </button>
    </div>
  )
}
