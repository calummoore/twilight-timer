import type { ReactNode } from 'react'
import { clock } from './format'

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (on: boolean) => void
  label: string
}) {
  return (
    <button
      className={`tog ${on ? 'on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    />
  )
}

const STEP_MS = 15_000
const MIN_MS = 15_000
const MAX_MS = 30 * 60_000

/** Minutes and seconds in 15-second steps. */
export function DurationStepper({
  ms,
  onChange,
  label,
}: {
  ms: number
  onChange: (ms: number) => void
  label: string
}) {
  const set = (next: number) =>
    onChange(Math.min(MAX_MS, Math.max(MIN_MS, next)))
  return (
    <div className="stepper">
      <button aria-label={`Shorter ${label}`} onClick={() => set(ms - STEP_MS)}>
        −
      </button>
      <b className="num">{clock(ms)}</b>
      <button aria-label={`Longer ${label}`} onClick={() => set(ms + STEP_MS)}>
        +
      </button>
    </div>
  )
}

export function Dialog({
  title,
  children,
  confirm,
  onConfirm,
  onCancel,
  danger = false,
}: {
  title: string
  children: ReactNode
  confirm: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog">
        <h3>{title}</h3>
        <p>{children}</p>
        <div className="btns">
          <button className="ibtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`big small ${danger ? 'red' : ''}`}
            onClick={onConfirm}
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
