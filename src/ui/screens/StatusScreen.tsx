import { STATUS_STEPS } from '../../model/rules'
import { roundStats } from '../../model/stats'
import type { GameView, PhaseView } from '../../model/view'
import { Toggle } from '../controls'
import { clock } from '../format'

type StatusView = Extract<PhaseView, { phase: 'status' }>

export function StatusScreen(props: {
  game: GameView
  view: StatusView
  onToggleStep: (step: number) => void
  onCustodians: (removed: boolean) => void
  onNext: () => void
}) {
  const { game, view } = props
  const timer = game.timer?.kind === 'status' ? game.timer : null
  const over =
    timer !== null && timer.limitMs !== null && timer.elapsedMs > timer.limitMs
  const stats = roundStats(game.entries, game.round, [])
  const done = view.steps.filter(Boolean).length

  return (
    <div
      className="content"
      style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 18 }}
    >
      <div className="pnl" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="pnl-h">
          Status phase steps{' '}
          <span className="pnl-note">
            {done} of {STATUS_STEPS.length}
          </span>
        </div>
        <div style={{ padding: 16 }}>
          <div className="steps">
            {STATUS_STEPS.map((step, i) => (
              <button
                key={step.label}
                className={`step ${view.steps[i] ? 'on' : ''}`}
                onClick={() => props.onToggleStep(i)}
              >
                <div className="bx">✓</div>
                <div className="lb">{step.label}</div>
                <div className="no">{step.note}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="pnl">
          <div className="tabletimer">
            <div className={`t num ${over ? 'clock-over' : ''}`}>
              {clock(timer?.elapsedMs ?? 0)}
            </div>
            <div className="l">
              Status phase ·{' '}
              {timer?.limitMs
                ? `limit ${clock(timer.limitMs)}`
                : 'no limit set'}
            </div>
          </div>
        </div>
        <div className="pnl" style={{ flex: 1 }}>
          <div className="pnl-h">Round {game.round} so far</div>
          <div style={{ padding: '14px 18px' }}>
            <div className="kv">
              <span>Strategy phase</span>
              <b className="num">{clock(stats.strategyMs)}</b>
            </div>
            <div className="kv">
              <span>Action phase</span>
              <b className="num">{clock(stats.actionMs)}</b>
            </div>
            <div className="kv">
              <span>Reaction windows</span>
              <b className="num">{clock(stats.reactionMs)}</b>
            </div>
            <div className="kv" style={{ border: 'none' }}>
              <span>Status phase</span>
              <b className="num">{clock(stats.statusMs)}</b>
            </div>
          </div>
        </div>
        <div className="pnl custodians">
          <div style={{ flex: 1 }}>
            <div className="lb">Custodians token removed</div>
            <div className="ds">
              The agenda phase runs every round once it is gone.
            </div>
          </div>
          <Toggle
            label="Custodians token removed"
            on={game.custodiansRemoved}
            onChange={props.onCustodians}
          />
        </div>
        <button
          className="big"
          style={{ fontSize: 23, padding: 21 }}
          onClick={props.onNext}
        >
          {game.custodiansRemoved ? 'BEGIN AGENDA PHASE' : 'END ROUND'}
        </button>
      </div>
    </div>
  )
}
