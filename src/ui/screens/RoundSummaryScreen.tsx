import { roundStats } from '../../model/stats'
import type { GameView } from '../../model/view'
import { pc } from '../colour'
import { clock, percent, words } from '../format'

export function RoundSummaryScreen(props: {
  game: GameView
  onNextRound: () => void
  onEndGame: () => void
}) {
  const { game } = props
  const ids = game.players.map((p) => p.id)
  const byId = new Map(game.players.map((p) => [p.id, p]))
  const stats = roundStats(game.entries, game.round, ids)
  const previous =
    game.round > 1 ? roundStats(game.entries, game.round - 1, []) : null
  const delta = previous ? stats.lengthMs - previous.lengthMs : null
  const widest = Math.max(
    1,
    ...stats.players.map((p) => p.turnMs + p.reactionMs),
  )
  const width = (ms: number) => `${(ms / widest) * 100}%`

  return (
    <>
      <div className="content">
        <div className="h1">Round {game.round} complete</div>
        <div className="h1s">
          {words(stats.lengthMs)} · game total {words(game.gameMs)}
        </div>
        <div className="stat-grid" style={{ marginTop: 22 }}>
          <div className="stat">
            <div className="l">Round length</div>
            <div className="v num">{clock(stats.lengthMs)}</div>
            <div className="s">
              {delta === null
                ? 'First round'
                : `${delta >= 0 ? '+' : '−'}${clock(Math.abs(delta))} vs round ${game.round - 1}`}
            </div>
          </div>
          <div className="stat">
            <div className="l">Action phase</div>
            <div className="v num">{clock(stats.actionMs)}</div>
            <div className="s">
              {percent(stats.actionMs, stats.lengthMs)} of the round
            </div>
          </div>
          <div className="stat">
            <div className="l">Reaction windows</div>
            <div className="v num">{clock(stats.reactionMs)}</div>
            <div className="s">
              {stats.reactionCount}{' '}
              {stats.reactionCount === 1 ? 'window' : 'windows'}
              {stats.reactionCount > 0 &&
                ` · avg ${clock(stats.reactionMs / stats.reactionCount)}`}
            </div>
          </div>
          <div className="stat">
            <div className="l">Overtime</div>
            <div
              className="v num"
              style={
                stats.overtimeMs > 0 ? { color: 'var(--danger)' } : undefined
              }
            >
              {clock(stats.overtimeMs)}
            </div>
            <div className="s">
              {stats.overLimitCount}{' '}
              {stats.overLimitCount === 1 ? 'time' : 'times'} over a limit
            </div>
          </div>
        </div>
        <div className="pnl">
          <div className="pnl-h">Time by player · this round</div>
          <div style={{ padding: '18px 20px' }}>
            <div className="bars">
              {stats.players.map((p) => (
                <div
                  key={p.playerId}
                  className="bar-row"
                  style={pc(byId.get(p.playerId)?.colour)}
                >
                  <div className="nm">
                    <i />
                    {byId.get(p.playerId)?.name}
                  </div>
                  <div className="track">
                    <u
                      className="ac"
                      style={{ width: width(p.turnMs - p.turnOvertimeMs) }}
                    />
                    {p.turnOvertimeMs > 0 && (
                      <u
                        className="ot"
                        style={{ width: width(p.turnOvertimeMs) }}
                      />
                    )}
                    <u className="win" style={{ width: width(p.reactionMs) }} />
                  </div>
                  <div className="vl num">{clock(p.turnMs + p.reactionMs)}</div>
                </div>
              ))}
            </div>
            <div className="legend">
              <span>
                <b style={{ background: 'var(--c-blue)' }} />
                Own turns
              </span>
              <span>
                <b style={{ background: '#2a4f70' }} />
                Reaction windows
              </span>
              <span>
                <b style={{ background: 'var(--danger)' }} />
                Overtime
              </span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 22px 20px', display: 'flex', gap: 12 }}>
        <button
          className="ibtn"
          style={{ padding: '18px 24px' }}
          onClick={props.onEndGame}
        >
          End game
        </button>
        <button className="big" style={{ flex: 1 }} onClick={props.onNextRound}>
          START ROUND {game.round + 1} — STRATEGY PHASE
        </button>
      </div>
    </>
  )
}
