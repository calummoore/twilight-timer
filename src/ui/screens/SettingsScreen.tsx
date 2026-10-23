import {
  ALARM_SOUNDS,
  type AlarmSound,
  type Settings,
} from '../../model/settings'
import type { TimerKey } from '../../model/types'
import { playAlarm, unlockAudio } from '../alarm'
import { DurationStepper, Toggle } from '../controls'

const TIMERS: { key: TimerKey; label: string; about: string }[] = [
  {
    key: 'turn',
    label: 'Turn limit',
    about: 'A single player turn in the action phase.',
  },
  {
    key: 'reactionWindow',
    label: 'Reaction window',
    about: 'Secondary abilities after a strategy card. Closes when time is up.',
  },
  {
    key: 'agendaDiscussion',
    label: 'Agenda discussion',
    about: 'Per agenda, before voting opens.',
  },
  { key: 'vote', label: 'Vote', about: 'Per player, from the speaker’s left.' },
  {
    key: 'statusPhase',
    label: 'Status phase',
    about: 'Whole table, across all seven steps.',
  },
  {
    key: 'strategyPick',
    label: 'Strategy pick',
    about: 'Per player, choosing a card.',
  },
]

const SOUND_NAMES: Record<AlarmSound, string> = {
  klaxon: 'Klaxon',
  chime: 'Chime',
  beep: 'Beep',
}

export function SettingsScreen(props: {
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
  onEndGame?: () => void
}) {
  const { settings, onChange } = props
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch })
  const setTimer = (key: TimerKey, patch: { on?: boolean; ms?: number }) =>
    set({
      limits: {
        ...settings.limits,
        [key]: { ...settings.limits[key], ...patch },
      },
    })

  return (
    <div className="lay settings-screen">
      <div className="top">
        <div className="round">
          <b>Settings</b>
        </div>
        <div className="spacer" />
        {props.onEndGame && (
          <button className="ibtn warnish" onClick={props.onEndGame}>
            End game
          </button>
        )}
        <button className="ibtn" onClick={props.onClose}>
          ✕ Close
        </button>
      </div>
      <div className="content">
        <div className="master">
          <div style={{ flex: 1 }}>
            <div className="lb">Enforce time limits</div>
            <div className="ds">
              Off is pure tracking. Clocks still run and every turn is recorded.
            </div>
          </div>
          <Toggle
            label="Enforce time limits"
            on={settings.enforceLimits}
            onChange={(enforceLimits) => set({ enforceLimits })}
          />
        </div>
        <div className="pnl">
          <div className="pnl-h">Timers</div>
          {TIMERS.map(({ key, label, about }) => {
            const limit = settings.limits[key]
            return (
              <div key={key} className={`set-row ${limit.on ? '' : 'off'}`}>
                <div>
                  <div className="lb">{label}</div>
                  <div className="ds">{about}</div>
                </div>
                <DurationStepper
                  label={label}
                  ms={limit.ms}
                  onChange={(ms) => setTimer(key, { ms })}
                />
                <Toggle
                  label={label}
                  on={limit.on}
                  onChange={(on) => setTimer(key, { on })}
                />
              </div>
            )
          })}
        </div>
        <div className="pnl" style={{ marginTop: 16 }}>
          <div className="pnl-h">When time is up</div>
          <div className="set-row">
            <div>
              <div className="lb">Alarm sound</div>
              <div className="ds">
                The clock turns red and counts overtime. Nothing ends on its
                own.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="fld sel"
                value={settings.alarmSound}
                onChange={(e) => {
                  const alarmSound = ALARM_SOUNDS.find(
                    (s) => s === e.target.value,
                  )
                  if (alarmSound) set({ alarmSound })
                }}
              >
                {ALARM_SOUNDS.map((s) => (
                  <option key={s} value={s}>
                    {SOUND_NAMES[s]}
                  </option>
                ))}
              </select>
              <button
                className="mini"
                onClick={() => {
                  unlockAudio()
                  playAlarm(settings.alarmSound)
                }}
              >
                Play
              </button>
            </div>
            <Toggle
              label="Alarm sound"
              on={settings.alarmOn}
              onChange={(alarmOn) => set({ alarmOn })}
            />
          </div>
        </div>
        <div className="pnl" style={{ marginTop: 16 }}>
          <div className="pnl-h">Display</div>
          <div className="set-row">
            <div>
              <div className="lb">Keep screen awake</div>
              <div className="ds">Stops the iPad sleeping mid-game.</div>
            </div>
            <div />
            <Toggle
              label="Keep screen awake"
              on={settings.keepAwake}
              onChange={(keepAwake) => set({ keepAwake })}
            />
          </div>
          <div className="set-row">
            <div>
              <div className="lb">Show game time on the rail</div>
              <div className="ds">
                Off shows only the current turn, which some groups find less
                competitive.
              </div>
            </div>
            <div />
            <Toggle
              label="Show game time on the rail"
              on={settings.showCumulative}
              onChange={(showCumulative) => set({ showCumulative })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
