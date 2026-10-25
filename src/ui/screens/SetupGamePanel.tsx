import type { Settings } from '../../model/settings'
import { clock } from '../format'

/** The Game panel of the setup screen: what the game starts with. */
export function SetupGamePanel(props: {
  count: number
  speakerName: string
  /** The player with the Naalu faction, or null when nobody has it. */
  naaluName: string | null
  /** A seat has no faction yet, so the game cannot begin. */
  factionsMissing: boolean
  settings: Settings
  onBegin: () => void
}) {
  const { settings } = props
  const limit = (key: 'turn' | 'reactionWindow') =>
    settings.limits[key].on ? clock(settings.limits[key].ms) : 'Off'

  return (
    <div className="pnl" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="pnl-h">Game</div>
      <div className="grow" style={{ padding: '16px 18px' }}>
        <div className="kv">
          <span>Players</span>
          <b>{props.count}</b>
        </div>
        <div className="kv">
          <span>Strategy cards each</span>
          <b>1</b>
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
      </div>
      <div style={{ padding: '16px 18px' }}>
        {props.factionsMissing && (
          <div className="setup-need">
            Pick a faction for every seat to begin.
          </div>
        )}
        <button
          className="big lg"
          style={{ width: '100%' }}
          disabled={props.factionsMissing}
          onClick={props.onBegin}
        >
          BEGIN GAME
        </button>
      </div>
    </div>
  )
}
