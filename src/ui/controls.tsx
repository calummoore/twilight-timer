import type { ReactNode } from 'react'
import type { Player } from '../model/types'
import { pc } from './colour'
import { clock } from './format'

export function Toggle({
  on,
  onChange,
  label,
  disabled = false,
}: {
  on: boolean
  onChange: (on: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      className={`tog ${on ? 'on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
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
  disabled = false,
}: {
  ms: number
  onChange: (ms: number) => void
  label: string
  disabled?: boolean
}) {
  const set = (next: number) =>
    onChange(Math.min(MAX_MS, Math.max(MIN_MS, next)))
  return (
    <div className="stepper">
      <button
        aria-label={`Shorter ${label}`}
        disabled={disabled}
        onClick={() => set(ms - STEP_MS)}
      >
        −
      </button>
      <b className="num">{clock(ms)}</b>
      <button
        aria-label={`Longer ${label}`}
        disabled={disabled}
        onClick={() => set(ms + STEP_MS)}
      >
        +
      </button>
    </div>
  )
}

/** The bar under the top bar while the device has no connection. */
export function NetBar() {
  return (
    <div className="netbar" role="status">
      <i />
      Reconnecting · your taps wait for the connection
    </div>
  )
}

/**
 * The small line on a disabled main button: the player that the game waits
 * for, or the table for a table tap. Nothing while the device may tap.
 */
export function WaitLabel({ waitsFor }: { waitsFor: string | null }) {
  return waitsFor === null ? null : <span className="k">{waitsFor}</span>
}

export interface DialogConfirm {
  label: string
  onConfirm: () => void
  danger?: boolean
  /** The button shows, but a tap does nothing, for example before a choice. */
  disabled?: boolean
}

/**
 * A full-stage overlay. Screen readers stay inside it until it closes. An
 * overlay that asks a question opens as a sheet at the bottom of a phone.
 */
export function Overlay({
  label,
  ask = false,
  children,
}: {
  label: string
  ask?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`overlay ${ask ? 'ask' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </div>
  )
}

/**
 * The shell of every modal dialog: a title, a line of text, optional
 * controls, and Cancel. A dialog without `confirm` acts in its controls.
 */
export function Dialog({
  title,
  children,
  content,
  confirm,
  onCancel,
}: {
  title: string
  /** The text below the title. */
  children: ReactNode
  /** Controls below the text, for example a choice of players. */
  content?: ReactNode
  confirm?: DialogConfirm
  onCancel: () => void
}) {
  return (
    <Overlay label={title} ask>
      <div className="dialog">
        <h3>{title}</h3>
        <p>{children}</p>
        {content}
        <div className="btns">
          <button className="ibtn" onClick={onCancel}>
            Cancel
          </button>
          {confirm && (
            <button
              className={`big small ${confirm.danger ? 'red' : ''}`}
              disabled={confirm.disabled}
              onClick={confirm.onConfirm}
            >
              {confirm.label}
            </button>
          )}
        </div>
      </div>
    </Overlay>
  )
}

/** The players as a grid of buttons. The chosen player is tinted and tagged. */
export function PlayerOptions({
  players,
  chosenId,
  tag,
  onChoose,
}: {
  players: Player[]
  chosenId: string | null
  tag?: string
  onChoose: (playerId: string) => void
}) {
  return (
    <div className="tokopts">
      {players.map((p) => {
        const on = p.id === chosenId
        return (
          <button
            key={p.id}
            className={`tokopt ${on ? 'on' : ''}`}
            style={pc(p.colour)}
            aria-pressed={on}
            onClick={() => onChoose(p.id)}
          >
            <i />
            {p.name}
            {on && tag && <span className="tag">{tag}</span>}
          </button>
        )
      })}
    </div>
  )
}
