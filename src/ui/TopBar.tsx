import type { Ref } from 'react'
import type { DeviceView } from '../model/protocol'
import type { Phase, Player } from '../model/types'
import { pc } from './colour'
import { clock } from './format'

/**
 * Each phase: the name that the bar shows, and its place in the game. A phone
 * shows the name next to the round, in place of the pill.
 */
const PHASES: Record<Phase, { name: string; step: number }> = {
  strategy: { name: 'Strategy', step: 1 },
  action: { name: 'Action', step: 2 },
  status: { name: 'Status', step: 3 },
  agenda: { name: 'Agenda', step: 4 },
  summary: { name: 'Summary', step: 5 },
  ended: { name: 'Game over', step: 6 },
}

/** The phases of a round, which the pill shows. */
const PILLS: Phase[] = ['strategy', 'action', 'status', 'agenda']

/** A solid gear with eight teeth and a round hole, in a 24 by 24 box. */
const GEAR_PATH =
  'M9.9 4L10.1 1.2L13.9 1.2L14.1 4L16.2 4.8L18.3 3L21 5.7L19.2 7.8L20 9.9L22.8 10.1L22.8 13.9L20 14.1L19.2 16.2L21 18.3L18.3 21L16.2 19.2L14.1 20L13.9 22.8L10.1 22.8L9.9 20L7.8 19.2L5.7 21L3 18.3L4.8 16.2L4 14.1L1.2 13.9L1.2 10.1L4 9.9L4.8 7.8L3 5.7L5.7 3L7.8 4.8ZM15.3 12a3.3 3.3 0 1 0 -6.6 0a3.3 3.3 0 1 0 6.6 0Z'

export interface TopBarProps {
  round: number
  phase: Phase
  speakerName: string
  gameMs: number
  /** This device, and the player of its seat, for the device chip. */
  device: DeviceView | undefined
  seat: Player | undefined
  /** Undo and Pause need an admin device with a connection. */
  canUndo: boolean
  canPause: boolean
  onSpeaker: () => void
  onPlayers: () => void
  onUndo: () => void
  onPause: () => void
  onSettings: () => void
  /** Measures the bar, so that the reaction window can open under it. */
  ref?: Ref<HTMLDivElement>
}

export function TopBar({ ref, ...props }: TopBarProps) {
  const at = PHASES[props.phase].step
  return (
    <div className="top game" ref={ref}>
      <div className="round">
        Round <b>{props.round}</b>
        <span className="ph-now">
          {' · '}
          <b>{PHASES[props.phase].name}</b>
        </span>
      </div>
      <div className="phase-pill">
        {PILLS.map((phase) => {
          const { name, step } = PHASES[phase]
          const cls = step === at ? 'on' : step < at ? 'done' : ''
          return (
            <span key={phase} className={cls}>
              {name}
            </span>
          )
        })}
      </div>
      <div className="chips">
        <button className="ibtn spkb" onClick={props.onSpeaker}>
          ★<span className="word"> Speaker:</span> {props.speakerName}
        </button>
        <DeviceChip
          device={props.device}
          seat={props.seat}
          onClick={props.onPlayers}
        />
      </div>
      <div className="spacer" />
      <div className="gt">
        Game <b className="num">{clock(props.gameMs)}</b>
      </div>
      <div className="tools">
        <button
          className="ibtn"
          onClick={props.onUndo}
          disabled={!props.canUndo}
        >
          ↺ Undo
        </button>
        <button
          className="ibtn"
          onClick={props.onPause}
          disabled={!props.canPause}
          aria-label="Pause"
        >
          ⏸<span className="word"> Pause</span>
        </button>
        <button
          className="ibtn icon"
          onClick={props.onSettings}
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d={GEAR_PATH} />
          </svg>
        </button>
      </div>
    </div>
  )
}

/** The seat of this device, Table, or Viewer. It opens Players & devices. */
function DeviceChip(props: {
  device: DeviceView | undefined
  seat: Player | undefined
  onClick: () => void
}) {
  const { device, seat } = props
  if (seat) {
    return (
      <button
        className="ibtn youb"
        style={pc(seat.colour)}
        onClick={props.onClick}
      >
        <i />
        <span className="word">You: </span>
        {seat.name}
      </button>
    )
  }
  return device?.admin ? (
    <button className="ibtn youb table" onClick={props.onClick}>
      <i />
      Table<span className="word"> device</span>
    </button>
  ) : (
    <button className="ibtn youb" onClick={props.onClick}>
      <i />
      Viewer
    </button>
  )
}
