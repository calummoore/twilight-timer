import { cardName } from '../../model/rules'
import { gameStats } from '../../model/stats'
import type { GameView } from '../../model/view'
import { pc } from '../colour'
import { clock, percent, plural, words } from '../format'

export function StatsScreen(props: {
  game: GameView
  onUndo: () => void
  onNewGame: () => void
}) {
  const { game } = props
  const byId = new Map(game.players.map((p) => [p.id, p]))
  const stats = gameStats(
    game.entries,
    game.players.map((p) => p.id),
  )
  const widest = Math.max(1, ...stats.players.map((p) => p.turnMs))
  const width = (ms: number) => `${(ms / widest) * 100}%`
  const phases = [
    {
      label: 'Action phase — own turns',
      ms: stats.phases.turnsMs,
      colour: 'var(--c-blue)',
    },
    {
      label: 'Reaction windows',
      ms: stats.phases.reactionMs,
      colour: '#2a4f70',
    },
    {
      label: 'Agenda phase',
      ms: stats.phases.agendaMs,
      colour: 'var(--c-purple)',
    },
    {
      label: 'Status phase',
      ms: stats.phases.statusMs,
      colour: 'var(--c-green)',
    },
    {
      label: 'Strategy phase',
      ms: stats.phases.strategyMs,
      colour: 'var(--c-yellow)',
    },
    {
      label: 'Between rounds',
      ms: stats.phases.betweenMs,
      colour: 'var(--line2)',
    },
  ]

  return (
    <div className="lay">
      <div className="top">
        <div className="round">
          <b>Game complete</b> · {plural(stats.rounds, 'round')}
        </div>
        <div className="spacer" />
        <button className="ibtn" onClick={props.onUndo}>
          ↺ Reopen game
        </button>
        <button className="ibtn" onClick={props.onNewGame}>
          New game
        </button>
      </div>
      <div className="content">
        <div className="h1">{words(game.gameMs)}</div>
        <div className="h1s">
          {[
            plural(game.players.length, 'player'),
            plural(stats.rounds, 'round'),
            plural(stats.turns, 'turn'),
            plural(stats.reactionCount, 'reaction window'),
          ].join(' · ')}
        </div>
        <div className="stat-grid" style={{ marginTop: 22 }}>
          <div className="stat">
            <div className="l">Longest round</div>
            <div className="v num">
              {clock(stats.longestRound?.lengthMs ?? 0)}
            </div>
            <div className="s">
              {stats.longestRound ? `Round ${stats.longestRound.round}` : '—'}
            </div>
          </div>
          <div className="stat">
            <div className="l">Average turn</div>
            <div className="v num">{clock(stats.averageTurnMs)}</div>
            <div className="s">across all players</div>
          </div>
          <div className="stat">
            <div className="l">Agenda phase total</div>
            <div className="v num">{clock(stats.phases.agendaMs)}</div>
            <div className="s">
              {percent(stats.phases.agendaMs, stats.totalMs)} of the game
            </div>
          </div>
          <div className="stat">
            <div className="l">Total overtime</div>
            <div
              className="v num"
              style={
                stats.overtimeMs > 0 ? { color: 'var(--danger)' } : undefined
              }
            >
              {clock(stats.overtimeMs)}
            </div>
            <div className="s">
              {plural(stats.overLimitCount, 'time')} over a limit
            </div>
          </div>
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 18 }}
        >
          <div className="pnl">
            <div className="pnl-h">
              Own-turn time by player{' '}
              <span className="pnl-note">
                {clock(stats.phases.turnsMs)} total
              </span>
            </div>
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
                        style={{
                          width: width(p.turnMs - p.turnOvertimeMs),
                        }}
                      />
                      {p.turnOvertimeMs > 0 && (
                        <u
                          className="ot"
                          style={{
                            width: width(p.turnOvertimeMs),
                          }}
                        />
                      )}
                    </div>
                    <div className="vl num">{clock(p.turnMs)}</div>
                  </div>
                ))}
              </div>
              <table className="tbl" style={{ marginTop: 20 }}>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Turns</th>
                    <th>Avg turn</th>
                    <th>Worst turn</th>
                    <th>Over limit</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.players.map((p) => (
                    <tr key={p.playerId}>
                      <td>
                        <div
                          className="pl"
                          style={pc(byId.get(p.playerId)?.colour)}
                        >
                          <i />
                          {byId.get(p.playerId)?.name}
                        </div>
                      </td>
                      <td className="num">{p.turns}</td>
                      <td className="num">{clock(p.averageMs)}</td>
                      <td className="num">{clock(p.worstMs)}</td>
                      <td
                        className="num"
                        style={{
                          color: p.overLimitCount
                            ? 'var(--danger)'
                            : 'var(--faint)',
                        }}
                      >
                        {p.overLimitCount
                          ? `${p.overLimitCount} · ${clock(p.limitOvertimeMs)}`
                          : '—'}
                      </td>
                      <td className="num">{percent(p.share, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pnl">
              <div className="pnl-h">Where the game went</div>
              <div style={{ padding: '16px 18px' }}>
                {phases.map((x) => (
                  <div key={x.label} style={{ marginBottom: 13 }}>
                    <div className="phase-line">
                      <span>{x.label}</span>
                      <b className="num">{clock(x.ms)}</b>
                    </div>
                    <div className="track" style={{ height: 9 }}>
                      <u
                        style={{
                          width: percent(x.ms, stats.totalMs),
                          background: x.colour,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pnl" style={{ flex: 1 }}>
              <div className="pnl-h">Longest turns</div>
              <div style={{ padding: '8px 18px 16px' }}>
                {stats.longestTurns.map((t) => (
                  <div
                    key={`${t.playerId}-${t.round}-${t.durationMs}`}
                    className="kv long-turn"
                    style={pc(byId.get(t.playerId)?.colour)}
                  >
                    <span className="pl">
                      <i />
                      {byId.get(t.playerId)?.name}{' '}
                      <span className="pnl-note">
                        R{t.round}
                        {t.card !== null
                          ? ` · ${cardName(t.card)} primary`
                          : ''}
                      </span>
                    </span>
                    <b className="num" style={{ color: 'var(--danger)' }}>
                      {clock(t.durationMs)}
                    </b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
