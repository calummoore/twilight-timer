import type { Ref } from 'react'
import type { Phase } from '../model/types'
import { clock } from './format'

const PILLS = [
  { phase: 'strategy', label: 'Strategy' },
  { phase: 'action', label: 'Action' },
  { phase: 'status', label: 'Status' },
  { phase: 'agenda', label: 'Agenda' },
] as const

/** The phase name that a phone shows next to the round, in place of the pill. */
const NAMES: Record<Phase, string> = {
  strategy: 'Strategy',
  action: 'Action',
  status: 'Status',
  agenda: 'Agenda',
  summary: 'Summary',
  ended: 'Game over',
}

const ORDER: Phase[] = [
  'strategy',
  'action',
  'status',
  'agenda',
  'summary',
  'ended',
]

export interface TopBarProps {
  round: number
  phase: Phase
  speakerName: string
  gameMs: number
  canUndo: boolean
  onSpeaker: () => void
  onUndo: () => void
  onPause: () => void
  onSettings: () => void
  /** Measures the bar, so that overlays can open under it. */
  ref?: Ref<HTMLDivElement>
}

export function TopBar({ ref, ...props }: TopBarProps) {
  const at = ORDER.indexOf(props.phase)
  return (
    <div className="top game" ref={ref}>
      <div className="round">
        Round <b>{props.round}</b>
        <span className="ph-now">
          {' · '}
          <b>{NAMES[props.phase]}</b>
        </span>
      </div>
      <div className="phase-pill">
        {PILLS.map((pill) => {
          const i = ORDER.indexOf(pill.phase)
          const cls = i === at ? 'on' : i < at ? 'done' : ''
          return (
            <span key={pill.phase} className={cls}>
              {pill.label}
            </span>
          )
        })}
      </div>
      <button className="ibtn spkb" onClick={props.onSpeaker}>
        ★ Speaker: {props.speakerName}
      </button>
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
        <button className="ibtn" onClick={props.onPause} aria-label="Pause">
          ⏸<span className="word"> Pause</span>
        </button>
        <button
          className="ibtn"
          onClick={props.onSettings}
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>
    </div>
  )
}
