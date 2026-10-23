import { useState } from 'react'
import { factionName } from '../../model/factions'
import { cardName } from '../../model/rules'
import type { GameView, PhaseView } from '../../model/view'
import { pc } from '../colour'
import { Dialog } from '../controls'
import { clock } from '../format'
import { isOver } from '../hooks'
import { InitiativeRail } from './InitiativeRail'

type ActionView = Extract<PhaseView, { phase: 'action' }>

export function ActionScreen(props: {
  game: GameView
  view: ActionView
  showCumulative: boolean
  alarming: boolean
  onSilence: () => void
  onEndTurn: () => void
  onPlayCard: () => void
  onPass: () => void
}) {
  const { game, view } = props
  const [confirmPass, setConfirmPass] = useState(false)
  const seat = game.players.findIndex((p) => p.id === view.activeId)
  const player = game.players[seat]
  const turn = game.timer?.kind === 'turn' ? game.timer : null
  const turnMs = view.reaction
    ? view.reaction.pausedTurnMs
    : (turn?.elapsedMs ?? 0)
  const limitMs = turn?.limitMs ?? null
  const over = isOver(turn)
  const totalMs =
    view.rail.find((r) => r.playerId === view.activeId)?.totalMs ?? 0
  const card = cardName(view.activeCard)
  const faction = factionName(player?.factionId ?? null)

  const pass = () => (view.cardPlayed ? props.onPass() : setConfirmPass(true))

  return (
    <div className="body">
      <div className={`hero ${over ? 'over' : ''}`} style={pc(player?.colour)}>
        {props.alarming && (
          <div className="alarm">
            <span className="ico">🔔</span>
            <div style={{ flex: 1 }}>
              <div className="b">TURN LIMIT EXCEEDED</div>
              <div className="s">
                The clock is counting overtime. Nothing has ended.
              </div>
            </div>
            <button className="ibtn warnish" onClick={props.onSilence}>
              Silence
            </button>
          </div>
        )}
        <div className="hero-top">
          <div className="dot" />
          <div>
            <h3>{player?.name}</h3>
            <div className="fac">
              {faction ? `${faction} · ` : ''}Seat {seat + 1}
            </div>
          </div>
          <div className="init">
            <div className="n num">{view.activeInitiative}</div>
            <div className="l">Initiative</div>
          </div>
        </div>
        <div className="bigclock num">{clock(turnMs)}</div>
        <div className="clock-sub">
          Turn {view.turnNumber} this round · game total <b>{clock(totalMs)}</b>
          {over && (
            <>
              {' '}
              · <b>counting overtime</b>
            </>
          )}
        </div>
        {limitMs !== null && (
          <>
            <div className="limitbar">
              <i style={{ width: `${Math.min(1, turnMs / limitMs) * 100}%` }} />
            </div>
            <div className="limitrow">
              <span>Turn limit {clock(limitMs)}</span>
              <span>
                {over
                  ? `Over by ${clock(turnMs - limitMs)}`
                  : `${clock(limitMs - turnMs)} remaining`}
              </span>
            </div>
          </>
        )}
        <div className="acts">
          <button
            className={`big ${over ? 'red' : ''}`}
            onClick={props.onEndTurn}
          >
            END TURN
          </button>
          <button
            className="sec hl"
            disabled={view.cardPlayed}
            onClick={props.onPlayCard}
          >
            <span className="k">Strategic action</span>
            {view.cardPlayed
              ? `${card} (${view.activeCard}) played ✓`
              : `Play ${card} (${view.activeCard}) ▸`}
          </button>
          <button
            className={`sec ${view.cardPlayed ? '' : 'muted'}`}
            onClick={pass}
          >
            <span className="k">
              {view.cardPlayed
                ? 'Out for the round'
                : 'Strategy card not played yet'}
            </span>
            Pass
          </button>
        </div>
      </div>
      <InitiativeRail
        game={game}
        view={view}
        showCumulative={props.showCumulative}
      />
      {confirmPass && (
        <Dialog
          title={`Pass before playing ${card}?`}
          confirm="Pass anyway"
          danger
          onCancel={() => setConfirmPass(false)}
          onConfirm={() => {
            setConfirmPass(false)
            props.onPass()
          }}
        >
          The rules say a player passes only after their strategic action. Pass
          anyway if the table agrees.
        </Dialog>
      )}
    </div>
  )
}
