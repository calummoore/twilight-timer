import { cardName } from '../../model/rules'
import type { GameView, PhaseView } from '../../model/view'
import { pc } from '../colour'
import { clock } from '../format'

type ActionView = Extract<PhaseView, { phase: 'action' }>

export function InitiativeRail(props: {
  game: GameView
  view: ActionView
  showCumulative: boolean
}) {
  const { game, view } = props
  const byId = new Map(game.players.map((p) => [p.id, p]))
  const turnMs =
    view.reaction?.pausedTurnMs ??
    (game.timer?.kind === 'turn' ? game.timer.elapsedMs : 0)
  return (
    <div className="rail">
      <div className="rail-h">
        <span className="t">Initiative · set by strategy card</span>
        <span className="c">
          {view.passedCount} of {view.rail.length} passed
        </span>
      </div>
      <div className="rail-b">
        {view.rail.map((row) => {
          const player = byId.get(row.playerId)
          const active = row.state === 'active'
          return (
            <div
              key={row.playerId}
              className={`row ${row.state}`}
              style={pc(player?.colour)}
            >
              {active && <b className="chip now">Turn</b>}
              {row.state === 'passed' && <b className="chip pass">Passed</b>}
              <div className="in num">{row.card}</div>
              <div>
                <div className="nm">
                  <i />
                  {player?.name}
                </div>
                <div className="fc">
                  <span className={`sccard ${row.cardPlayed ? 'used' : ''}`}>
                    {row.cardPlayed ? '✓ ' : ''}
                    {cardName(row.card)}
                  </span>
                  {player?.faction}
                </div>
              </div>
              <div className="tm">
                <div className="a num">
                  {props.showCumulative
                    ? clock(row.totalMs)
                    : active
                      ? clock(turnMs)
                      : ''}
                </div>
                <div className="b num">
                  {active
                    ? `this turn ${clock(turnMs)}`
                    : `${row.turns} ${row.turns === 1 ? 'turn' : 'turns'}`}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="rail-f">
        <span>
          <span className="sccard" style={{ marginRight: 5 }}>
            Card
          </span>
          still to play
        </span>
        <span>
          <span className="sccard used" style={{ marginRight: 5 }}>
            ✓ Card
          </span>
          already played
        </span>
      </div>
    </div>
  )
}
