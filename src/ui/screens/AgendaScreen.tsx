import { AGENDAS_PER_ROUND } from '../../model/rules'
import type { GameView, PhaseView } from '../../model/view'
import { pc } from '../colour'
import { clock, timerText } from '../format'

type AgendaView = Extract<PhaseView, { phase: 'agenda' }>

export function AgendaScreen(props: {
  game: GameView
  view: AgendaView
  onOpenVoting: () => void
  onVoteCast: () => void
  onResolve: () => void
}) {
  const { game, view } = props
  const byId = new Map(game.players.map((p) => [p.id, p]))
  const timer = game.timer
  const voting = view.voters.find((v) => v.state === 'now')
  const voter = voting ? byId.get(voting.playerId) : undefined
  const voteClock =
    timer?.kind === 'vote'
      ? timerText(timer.elapsedMs, timer.limitMs, true)
      : null
  const discussing = view.stage === 'discussion' && timer?.kind === 'discussion'
  const discussionMs = discussing ? timer.elapsedMs : view.discussionMs
  const limitMs = discussing ? timer.limitMs : view.discussionLimitMs
  const discussionOver = limitMs !== null && discussionMs > limitMs
  const voted = view.voters.filter((v) => v.state === 'done').length
  const last = view.agenda >= AGENDAS_PER_ROUND

  return (
    <div className="content split agenda" style={{ '--side': '430px' }}>
      <div className="col">
        <div className="agenda-card ag-card">
          <div className="k">
            Agenda {view.agenda} of {AGENDAS_PER_ROUND}
          </div>
          <h4>
            {view.stage === 'discussion'
              ? 'Discussion'
              : view.stage === 'voting'
                ? 'Voting'
                : 'Resolve the outcome'}
          </h4>
          <p>
            Read the agenda aloud, discuss it, then vote from the speaker’s
            left.
          </p>
        </div>
        <div
          className="pnl grow ag-votes"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <div className="pnl-h">
            Voting · from the speaker’s left, speaker last
            <span className="pnl-note">
              {voted} of {view.voters.length} voted
            </span>
          </div>
          <div className="scroll" style={{ padding: 14 }}>
            {view.voters.map((v, i) => (
              <div
                key={v.playerId}
                className={`vote-row ${v.state}`}
                style={pc(byId.get(v.playerId)?.colour)}
              >
                <div className="ord num">
                  {i + 1}
                  {v.playerId === game.speakerId ? ' ★' : ''}
                </div>
                <div className="nm">
                  <i />
                  {byId.get(v.playerId)?.name}
                </div>
                <div className={`badge ${v.state === 'done' ? 'f' : ''}`}>
                  {v.state === 'done'
                    ? 'Voted'
                    : v.state === 'now'
                      ? 'Voting…'
                      : 'Waiting'}
                </div>
                <div
                  className={`vt num ${v.state === 'now' && voteClock?.over ? 'clock-over' : ''}`}
                >
                  {v.durationMs !== null
                    ? clock(v.durationMs)
                    : v.state === 'now'
                      ? voteClock?.text
                      : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="col side">
        <div className="pnl ag-disc">
          <div className="tabletimer" style={{ padding: '22px 0 18px' }}>
            <div className={`t num md ${discussionOver ? 'clock-over' : ''}`}>
              {clock(discussionMs)}
            </div>
            <div className="l">
              Discussion{limitMs !== null ? ` · limit ${clock(limitMs)}` : ''}
              {discussionOver && (
                <span style={{ color: 'var(--danger)' }}>
                  {' '}
                  · over by {clock(discussionMs - limitMs)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="pnl grow ag-now">
          <div className="pnl-h">
            {view.stage === 'resolving'
              ? 'Every player has voted'
              : 'Now voting'}
          </div>
          {voter && voteClock ? (
            <div className="voter-now" style={pc(voter.colour)}>
              <div className="who">
                <i />
                {voter.name}
              </div>
              <div className={`t num ${voteClock.over ? 'clock-over' : ''}`}>
                {voteClock.text}
              </div>
              <button className="big small" onClick={props.onVoteCast}>
                VOTE CAST — NEXT PLAYER
              </button>
            </div>
          ) : (
            <div className="voter-now">
              {view.stage === 'discussion' ? (
                <button className="big small" onClick={props.onOpenVoting}>
                  OPEN VOTING
                </button>
              ) : (
                <div className="ds">Count the votes and apply the outcome.</div>
              )}
            </div>
          )}
        </div>
        <button className="big md ag-resolve" onClick={props.onResolve}>
          {last ? 'RESOLVE → END ROUND' : `RESOLVE → AGENDA ${view.agenda + 1}`}
        </button>
      </div>
    </div>
  )
}
