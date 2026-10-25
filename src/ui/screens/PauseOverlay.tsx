import type { PauseView } from '../../model/pauses'
import { PAUSE_REASONS, type PauseReason } from '../../model/types'
import { clock } from '../format'
import { reasonLabel } from '../reasons'

/** Pause, the plain pause, comes first and is the default. */
const CHOICES: (PauseReason | null)[] = [null, ...PAUSE_REASONS]

/** The pause card over the whole stage: the pause clock, the reason, and Resume. */
export function PauseOverlay(props: {
  pause: PauseView
  onReason: (reason: PauseReason | null) => void
  onResume: () => void
}) {
  const { pause } = props
  return (
    <div className="overlay">
      <div className="pause-card">
        <div className="t num">{clock(pause.elapsedMs)}</div>
        <div className="l">Game paused · no clock is running</div>
        <div className="reasons" role="group" aria-label="Pause reason">
          {CHOICES.map((reason) => {
            const on = reason === pause.reason
            return (
              <button
                key={reason ?? 'plain'}
                className={on ? 'on' : undefined}
                aria-pressed={on}
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
        <button className="big small" onClick={props.onResume}>
          RESUME
        </button>
      </div>
    </div>
  )
}
