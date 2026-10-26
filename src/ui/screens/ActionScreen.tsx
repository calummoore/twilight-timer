import { useState } from 'react'
import { factionName } from '../../model/factions'
import { cardName } from '../../model/rules'
import type { GameView, PhaseView } from '../../model/view'
import { pc } from '../colour'
import { Dialog, WaitLabel } from '../controls'
import { clock } from '../format'
import { isOver } from '../hooks'
import { whose, type Rights } from '../rights'
import { InitiativeRail } from './InitiativeRail'

type ActionView = Extract<PhaseView, { phase: 'action' }>

export function ActionScreen(props: {
  game: GameView
  view: ActionView
  rights: Rights
  showCumulative: boolean
  alarming: boolean
  onSilence: () => void
  onEndTurn: () => void
  onPlayCard: (card: number) => void
  onPass: () => void
}) {
  const { game, view, rights } = props
  const [confirmPass, setConfirmPass] = useState(false)
  const seat = game.players.findIndex((p) => p.id === view.activeId)
  const player = game.players[seat]
  const turn = game.timer?.kind === 'turn' ? game.timer : null
  const turnMs = view.reaction ? view.reaction.turnMs : (turn?.elapsedMs ?? 0)
  const limitMs = turn?.limitMs ?? null
  const over = isOver(turn)
  const totalMs =
    view.rail.find((r) => r.playerId === view.activeId)?.totalMs ?? 0
  const faction = factionName(player?.factionId ?? null)
  // At 3 or 4 players, each card has its own button.
  const cards = view.activeCards
  const unplayed = cards.filter((c) => !c.played).map((c) => cardName(c.card))

  const pass = () =>
    unplayed.length === 0 ? props.onPass() : setConfirmPass(true)

  return (
    <div className="body">
      <div className={`hero ${over ? 'over' : ''}`} style={pc(player?.colour)}>
        {props.alarming && turn && (
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
        <div className={`acts ${cards.length > 1 ? 'two' : ''}`}>
          <button
            className={`big ${over ? 'red' : ''}`}
            disabled={!rights.may({ kind: 'turnEnded' })}
            onClick={props.onEndTurn}
          >
            <WaitLabel
              waitsFor={rights.waits(
                { kind: 'turnEnded' },
                whose(player?.name, 'turn'),
              )}
            />
            END TURN
          </button>
          {cards.map(({ card, played }) => (
            <button
              key={card}
              className="sec hl"
              disabled={
                played || !rights.may({ kind: 'strategyCardPlayed', card })
              }
              onClick={() => props.onPlayCard(card)}
            >
              <span className="k">Strategic action</span>
              {played
                ? `${cardName(card)} (${card}) played ✓`
                : `Play ${cardName(card)} (${card}) ▸`}
            </button>
          ))}
          <button
            className={`sec ${unplayed.length === 0 ? '' : 'muted'}`}
            disabled={!rights.may({ kind: 'passed' })}
            onClick={pass}
          >
            <span className="k">
              {unplayed.length === 0
                ? 'Out for the round'
                : unplayed.length === 1
                  ? 'Strategy card not played yet'
                  : 'Strategy cards not played yet'}
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
          title={`Pass before playing ${unplayed.join(' and ')}?`}
          confirm={{
            label: 'Pass anyway',
            danger: true,
            onConfirm: () => {
              setConfirmPass(false)
              props.onPass()
            },
          }}
          onCancel={() => setConfirmPass(false)}
        >
          {unplayed.length > 1
            ? 'The rules say a player passes only after both strategic actions.'
            : 'The rules say a player passes only after their strategic action.'}{' '}
          Pass anyway if the table agrees.
        </Dialog>
      )}
    </div>
  )
}
