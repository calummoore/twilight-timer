import { factionName } from '../../model/factions'
import { cardName } from '../../model/rules'
import type { Player } from '../../model/types'
import type { GameView, ReactionView, SpeakerChoice } from '../../model/view'
import { pc } from '../colour'
import { clock, timerText } from '../format'

const EXTEND_MS = 60_000

export function ReactionOverlay(props: {
  game: GameView
  reaction: ReactionView
  onDone: (playerId: string) => void
  onExtend: (ms: number) => void
  onSpeaker: (playerId: string) => void
  onClose: () => void
}) {
  const { game, reaction: r } = props
  const byId = new Map(game.players.map((p) => [p.id, p]))
  const by = byId.get(r.byId)
  const seated = game.seated.includes(r.byId)
  const time = timerText(r.elapsedMs, r.limitMs, true)

  return (
    <>
      <div className="scrim" />
      <div className="rw" role="dialog" aria-label="Reaction window">
        <div className="rw-h" style={pc(by?.colour)}>
          <div>
            <div className="lbl">Strategic action · secondary abilities</div>
            <h3>
              {cardName(r.card)}{' '}
              <span style={{ color: 'var(--faint)', fontWeight: 600 }}>
                ({r.card})
              </span>
            </h3>
            <div className="by">
              <i />
              Played by {by?.name} ·{' '}
              {seated ? (
                <>
                  {r.endsTurn ? 'their turn took' : 'their clock is paused at'}{' '}
                  <b
                    className="num"
                    style={{ color: 'var(--dim)', marginLeft: 4 }}
                  >
                    {clock(r.turnMs)}
                  </b>
                </>
              ) : (
                'left the game'
              )}
            </div>
          </div>
          <div className="rw-clock">
            <div className={`t num ${time.over ? 'over' : ''}`}>
              {time.text}
            </div>
            <div className="l">{clockLabel(r.limitMs, time.over)}</div>
          </div>
        </div>
        <div className="rw-bar">
          {r.limitMs !== null && (
            <i
              style={{
                width: `${(Math.max(0, r.limitMs - r.elapsedMs) / r.limitMs) * 100}%`,
              }}
            />
          )}
        </div>
        {r.speakerChoice && (
          <SpeakerRow
            choice={r.speakerChoice}
            byId={byId}
            onSpeaker={props.onSpeaker}
          />
        )}
        <div className="tiles">
          {r.tiles.map((tile) => {
            const p = byId.get(tile.playerId)
            const done = tile.tookMs !== null
            return (
              <div
                key={tile.playerId}
                className={`tile ${done ? 'done' : 'wait'}`}
                style={pc(p?.colour)}
              >
                {tile.left ? (
                  <span className="pchip">Left</span>
                ) : (
                  tile.passed && <span className="pchip">Passed</span>
                )}
                <div className="nm">
                  <i />
                  {p?.name}
                </div>
                <div className="fc">{factionName(p?.factionId ?? null)}</div>
                {tile.tookMs !== null ? (
                  <>
                    <div className="st">✓ Done</div>
                    <div className="took num">Took {clock(tile.tookMs)}</div>
                  </>
                ) : (
                  <button
                    className="tapme"
                    onClick={() => props.onDone(tile.playerId)}
                  >
                    MARK DONE
                  </button>
                )}
              </div>
            )
          })}
          <div className="tile tile-idle">
            <div>
              Active player <br />
              does not react
            </div>
          </div>
        </div>
        <div className="rw-f">
          <div className="note">
            <b style={{ color: 'var(--dim)' }}>
              {r.doneCount} of {r.tiles.length} done.
            </b>{' '}
            {r.endsTurn && seated ? (
              <>
                The window closes and {by?.name}’s turn ends when the last
                player marks done.
              </>
            ) : (
              'The window closes when the last player marks done.'
            )}
          </div>
          <div className="spacer" />
          {r.limitMs !== null && (
            <button className="ibtn" onClick={() => props.onExtend(EXTEND_MS)}>
              ＋ Add 1:00
            </button>
          )}
          <button className="big small" onClick={props.onClose}>
            MARK ALL DONE
          </button>
        </div>
      </div>
    </>
  )
}

/** The line under the window clock. Past the limit, the window stays open. */
function clockLabel(limitMs: number | null, over: boolean): string {
  if (limitMs === null) return 'Window open'
  return over
    ? `Over the ${clock(limitMs)} window limit`
    : `Window remaining · ${clock(limitMs)}`
}

/** Politics: one tap hands the speaker token to a player. */
function SpeakerRow(props: {
  choice: SpeakerChoice
  byId: Map<string, Player>
  onSpeaker: (playerId: string) => void
}) {
  const { choice, byId } = props
  const from = byId.get(choice.fromId)?.name
  const chosen = choice.chosenId === null ? null : byId.get(choice.chosenId)

  return (
    <div className="rw-spk" role="group" aria-label="New speaker">
      <div className="l">
        <b>★ New speaker</b>
        <span>
          {chosen
            ? `${chosen.name} is the new speaker.`
            : `Tap the player who takes the token from ${from}.`}
        </span>
      </div>
      <div className="opts">
        {choice.options.map((id) => {
          const p = byId.get(id)
          const on = id === choice.chosenId
          return (
            <button
              key={id}
              className={`spkopt ${on ? 'on' : ''}`}
              style={pc(p?.colour)}
              aria-pressed={on}
              disabled={on}
              onClick={() => props.onSpeaker(id)}
            >
              <i />
              <span className="n">{p?.name}</span>
              {on && <span>★</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
