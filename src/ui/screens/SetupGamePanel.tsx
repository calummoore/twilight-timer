import { EXPANSIONS } from '../../model/factions'
import { cardsEach } from '../../model/rules'
import type { Expansions, Settings } from '../../model/settings'
import { clock } from '../format'

/** Why Create game made no game: no answer, or a newer build of the server. */
export type CreateFailure = 'offline' | 'outdated'

/**
 * The Game panel of the setup screen: what the game starts with. Its summary
 * rows scroll when the panel is full, so the expansions, the deal, and CREATE
 * GAME stay in view.
 */
export function SetupGamePanel(props: {
  count: number
  speakerName: string
  /** The player with the Naalu faction, or null when nobody has it. */
  naaluName: string | null
  /** A seat has no faction yet, so the game cannot begin. */
  factionsMissing: boolean
  settings: Settings
  /** Create game waits for the server. */
  creating: boolean
  /** Why the last Create game made no game, or null. */
  failure: CreateFailure | null
  onExpansions: (expansions: Expansions) => void
  /** Gives each seat with no faction a random faction in play. */
  onDeal: () => void
  onCreate: () => void
  /** Reloads the page, after a reload that did not bring the new build. */
  onReload: () => void
}) {
  const { settings } = props
  const { expansions } = settings
  const cards = cardsEach(props.count)
  const limit = (key: 'turn' | 'reactionWindow') =>
    settings.limits[key].on ? clock(settings.limits[key].ms) : 'Off'

  return (
    <div
      className="pnl"
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <div className="pnl-h">Game</div>
      <div className="grow scroll" style={{ padding: '16px 18px' }}>
        <div className="kv">
          <span>Players</span>
          <b>{props.count}</b>
        </div>
        <div className="kv">
          <span>Strategy cards each</span>
          <b>{cards}</b>
        </div>
        <div className="kv">
          <span>Speaker</span>
          <b>{props.speakerName}</b>
        </div>
        {props.naaluName !== null && (
          <div className="kv">
            <span>Naalu 0 token</span>
            <b>{props.naaluName}</b>
          </div>
        )}
        <div className="kv">
          <span>Time limits</span>
          <b
            style={
              settings.enforceLimits ? { color: 'var(--warn)' } : undefined
            }
          >
            {settings.enforceLimits ? 'Enabled' : 'Off'}
          </b>
        </div>
        {settings.enforceLimits && (
          <>
            <div className="kv">
              <span>Turn limit</span>
              <b>{limit('turn')}</b>
            </div>
            <div className="kv" style={{ border: 'none' }}>
              <span>Reaction window</span>
              <b>{limit('reactionWindow')}</b>
            </div>
          </>
        )}
        <div className="setup-help">
          Seat order is the physical ring. The <b>speaker ★</b> picks first in
          the strategy phase and votes last in the agenda phase.
        </div>
        {cards === 2 && (
          <div className="setup-help">
            At 3–4 players each player picks <b>two</b> strategy cards, and the
            lower card sets their place in the turn order.
          </div>
        )}
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div className="exps">
          <div className="lbl">Expansions</div>
          <div className="exp-row">
            {EXPANSIONS.map(({ id, name }) => {
              const on = expansions[id]
              return (
                <button
                  key={id}
                  className={`exp ${on ? 'on' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    props.onExpansions({ ...expansions, [id]: !on })
                  }
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
        {props.factionsMissing && (
          <>
            <div className="setup-need">
              Pick a faction for every seat to create the game.
            </div>
            <button className="deal" onClick={props.onDeal}>
              Random factions for empty seats
            </button>
          </>
        )}
        {props.failure === 'offline' && !props.creating && (
          <div className="setup-need">
            The game could not be created. Check the connection and try again.
          </div>
        )}
        {props.failure === 'outdated' ? (
          <>
            <div className="setup-need">
              A new version is live. Reload the page.
            </div>
            <button
              className="big lg"
              style={{ width: '100%' }}
              onClick={props.onReload}
            >
              RELOAD
            </button>
          </>
        ) : (
          <button
            className="big lg"
            style={{ width: '100%' }}
            disabled={props.factionsMissing || props.creating}
            onClick={props.onCreate}
          >
            {props.creating ? 'CREATING…' : 'CREATE GAME'}
          </button>
        )}
      </div>
    </div>
  )
}
