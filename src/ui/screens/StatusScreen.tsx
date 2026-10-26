import { STATUS_STEPS } from '../../model/rules'
import { roundStats } from '../../model/stats'
import type { GameView, PhaseView } from '../../model/view'
import { Toggle, WaitLabel } from '../controls'
import { clock } from '../format'
import type { Rights } from '../rights'

type StatusView = Extract<PhaseView, { phase: 'status' }>

export function StatusScreen(props: {
  game: GameView
  view: StatusView
  rights: Rights
  onToggleStep: (step: number) => void
  onCustodians: (removed: boolean) => void
  onNext: () => void
}) {
  const { game, view, rights } = props
  const next = { kind: 'phaseStepped' } as const
  const timer = game.timer?.kind === 'status' ? game.timer : null
  const over =
    timer !== null && timer.limitMs !== null && timer.elapsedMs > timer.limitMs
  const stats = roundStats(game.entries, game.round, [])
  const done = view.steps.filter(Boolean).length

  return (
    <div className="content split status" style={{ '--side': '420px' }}>
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
                disabled={!rights.may({ kind: 'statusStepToggled', step: i })}
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
      <div className="col side">
        <div className="pnl timer">
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
        <div className="pnl grow">
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
            disabled={
              !rights.may({
                kind: 'custodiansSet',
                removed: !game.custodiansRemoved,
              })
            }
            onChange={props.onCustodians}
          />
        </div>
        <button
          className="big lg"
          disabled={!rights.may(next)}
          onClick={props.onNext}
        >
          <WaitLabel waitsFor={rights.waits(next, null)} />
          {game.custodiansRemoved ? 'BEGIN AGENDA PHASE' : 'END ROUND'}
        </button>
      </div>
    </div>
  )
}
