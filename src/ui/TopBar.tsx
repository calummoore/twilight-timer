import type { Phase } from '../model/types'
import { clock } from './format'

const PILLS = [
  { phase: 'strategy', label: 'Strategy' },
  { phase: 'action', label: 'Action' },
  { phase: 'status', label: 'Status' },
  { phase: 'agenda', label: 'Agenda' },
] as const

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
}

export function TopBar(props: TopBarProps) {
  const at = ORDER.indexOf(props.phase)
  return (
    <div className="top">
      <div className="round">
        Round <b>{props.round}</b>
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
      <button className="ibtn" onClick={props.onUndo} disabled={!props.canUndo}>
        ↺ Undo
      </button>
      <button className="ibtn" onClick={props.onPause}>
        ⏸ Pause
      </button>
      <button
        className="ibtn icon"
        onClick={props.onSettings}
        aria-label="Settings"
      >
        ⚙
      </button>
    </div>
  )
}
