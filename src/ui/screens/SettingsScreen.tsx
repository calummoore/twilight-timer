import {
  ALARM_SOUNDS,
  type AlarmSound,
  type LimitSettings,
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
    about:
      'Secondary abilities after a strategy card is played. Charged to nobody.',
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

/**
 * The settings in two groups. The time limits belong to the game, so every
 * device follows them and only an admin device changes them. The alarm and
 * the display belong to this device.
 */
export function SettingsScreen(props: {
  /** The settings of this device. */
  settings: Settings
  onChange: (settings: Settings) => void
  /** The time limits of the game, or of the next game before it exists. */
  limits: LimitSettings
  /** Changes the time limits. Absent when this device may not. */
  onLimits?: (limits: LimitSettings) => void
  /** Before a game: the limits are the ones that the next game starts with. */
  beforeGame?: boolean
  /** In a game: End game, which needs an admin device. */
  endGame?: { allowed: boolean; onEnd: () => void }
  onClose: () => void
}) {
  const { settings, onChange, limits, onLimits } = props
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch })
  const locked = !onLimits
  const setLimits = (patch: Partial<LimitSettings>) =>
    onLimits?.({ ...limits, ...patch })
  const setTimer = (key: TimerKey, patch: { on?: boolean; ms?: number }) =>
    setLimits({
      limits: { ...limits.limits, [key]: { ...limits.limits[key], ...patch } },
    })

  return (
    <div className="lay settings-screen">
      <div className="top">
        <div className="round">
          <b>Settings</b>
        </div>
        <div className="spacer" />
        {props.endGame && (
          <button
            className="ibtn warnish"
            disabled={!props.endGame.allowed}
            onClick={props.endGame.onEnd}
          >
            End game
          </button>
        )}
        <button className="ibtn" onClick={props.onClose}>
          ✕ Close
        </button>
      </div>
      <div className="content">
        <div className="setup-label">
          {props.beforeGame
            ? 'New game · the limits it starts with'
            : 'Game · every device follows these'}
        </div>
        <div className="master">
          <div style={{ flex: 1 }}>
            <div className="lb">Enforce time limits</div>
            <div className="ds">
              Off is pure tracking. Clocks still run and every turn is recorded.
            </div>
          </div>
          <Toggle
            label="Enforce time limits"
            on={limits.enforceLimits}
            disabled={locked}
            onChange={(enforceLimits) => setLimits({ enforceLimits })}
          />
        </div>
        <div className="pnl">
          <div className="pnl-h">Timers</div>
          {TIMERS.map(({ key, label, about }) => {
            const limit = limits.limits[key]
            return (
              <div key={key} className={`set-row ${limit.on ? '' : 'off'}`}>
                <div className="txt">
                  <div className="lb">{label}</div>
                  <div className="ds">{about}</div>
                </div>
                <div className="ctl">
                  <DurationStepper
                    label={label}
                    ms={limit.ms}
                    disabled={locked}
                    onChange={(ms) => setTimer(key, { ms })}
                  />
                </div>
                <Toggle
                  label={label}
                  on={limit.on}
                  disabled={locked}
                  onChange={(on) => setTimer(key, { on })}
                />
              </div>
            )
          })}
        </div>
        <div className="setup-label" style={{ marginTop: 26 }}>
          This device
        </div>
        <div className="pnl">
          <div className="pnl-h">Alarm</div>
          <div className="set-row">
            <div className="txt">
              <div className="lb">Alarm sound</div>
              <div className="ds">
                Sounds on this device when a limit passes. The clock turns red
                and counts overtime. Nothing ends on its own.
              </div>
            </div>
            <div className="ctl" style={{ display: 'flex', gap: 8 }}>
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
            <div className="txt">
              <div className="lb">Keep screen awake</div>
              <div className="ds">Stops the screen sleeping mid-game.</div>
            </div>
            <div className="ctl" />
            <Toggle
              label="Keep screen awake"
              on={settings.keepAwake}
              onChange={(keepAwake) => set({ keepAwake })}
            />
          </div>
          <div className="set-row">
            <div className="txt">
              <div className="lb">Show game time on the rail</div>
              <div className="ds">
                Off shows only the current turn, which some groups find less
                competitive.
              </div>
            </div>
            <div className="ctl" />
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
