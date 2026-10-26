import { inGameTime, type PauseView } from '../../model/pauses'
import { PAUSE_REASONS, type PauseReason } from '../../model/types'
import { Overlay } from '../controls'
import { clock } from '../format'
import { reasonLabel } from '../reasons'

/** Pause, the plain pause, comes first and is the default. */
const CHOICES: (PauseReason | null)[] = [null, ...PAUSE_REASONS]

/** The pause card over the whole stage: the pause clock, the reason, and Resume. */
export function PauseOverlay(props: {
  pause: PauseView
  /** The reason and Resume belong to admin devices. */
  canChange: boolean
  onReason: (reason: PauseReason | null) => void
  onResume: () => void
}) {
  const { pause } = props
  return (
    <Overlay label="Game paused">
      <div className="pause-card">
        <div className="t num">{clock(pause.elapsedMs)}</div>
        <div className="l">
          {pause.reason !== null && inGameTime(pause.reason)
            ? 'Game paused · only the game clock is running'
            : 'Game paused · no clock is running'}
        </div>
        <div className="reasons" role="group" aria-label="Pause reason">
          {CHOICES.map((reason) => {
            const on = reason === pause.reason
            return (
              <button
                key={reason ?? 'plain'}
                className={on ? 'on' : undefined}
                aria-pressed={on}
                disabled={!props.canChange}
                onClick={() => props.onReason(reason)}
              >
                {reasonLabel(reason)}
              </button>
            )
          })}
        </div>
        <div className="reason-time">
          {pause.reason !== null && (
            <>
              {reasonLabel(pause.reason)}
              <b className="num">{clock(pause.reasonMs ?? 0)}</b>
            </>
          )}
        </div>
        <button
          className="big small"
          disabled={!props.canChange}
          onClick={props.onResume}
        >
          RESUME
        </button>
      </div>
    </Overlay>
  )
}
