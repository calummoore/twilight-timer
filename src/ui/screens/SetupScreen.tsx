import { useState } from 'react'
import {
  COLOURS,
  DEFAULT_PLAYERS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Colour,
} from '../../model/rules'
import type { Settings } from '../../model/settings'
import type { Player } from '../../model/types'
import { pc } from '../colour'
import { FACTIONS } from '../factions'
import { clock } from '../format'

interface Row {
  name: string
  colour: Colour
  faction: string
}

const COUNTS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => MIN_PLAYERS + i,
)

export function SetupScreen(props: {
  settings: Settings
  notice: string | null
  canLoadLast: boolean
  onDismissNotice: () => void
  onLoadLast: () => void
  onSettings: () => void
  onBegin: (players: Player[], speakerId: string) => void
}) {
  const [count, setCount] = useState(DEFAULT_PLAYERS)
  const [rows, setRows] = useState<Row[]>(() =>
    COLOURS.map((colour) => ({ name: '', colour, faction: '' })),
  )
  const [speaker, setSpeaker] = useState(0)
  const seats = rows.slice(0, count)
  const nameOf = (i: number) => seats[i]?.name.trim() || `Player ${i + 1}`
  const { settings } = props

  const update = (i: number, patch: Partial<Row>) =>
    setRows((all) =>
      all.map((row, j) => (j === i ? { ...row, ...patch } : row)),
    )

  // Colours stay unique: taking a colour swaps it with its current owner.
  const pickColour = (i: number, colour: Colour) =>
    setRows((all) => {
      const owner = all.findIndex((row) => row.colour === colour)
      const mine = all[i]?.colour ?? colour
      return all.map((row, j) =>
        j === i
          ? { ...row, colour }
          : j === owner
            ? { ...row, colour: mine }
            : row,
      )
    })

  const move = (i: number, by: number) => {
    const j = i + by
    setRows((all) => {
      const next = [...all]
      const [a, b] = [next[i], next[j]]
      if (!a || !b) return all
      next[i] = b
      next[j] = a
      return next
    })
    if (speaker === i) setSpeaker(j)
    else if (speaker === j) setSpeaker(i)
  }

  const begin = () => {
    const players = seats.map((row, i) => ({
      id: `p${i + 1}`,
      name: nameOf(i),
      colour: row.colour,
      faction: row.faction.trim(),
    }))
    props.onBegin(players, `p${speaker + 1}`)
  }

  const limit = (key: 'turn' | 'reactionWindow') =>
    settings.limits[key].on ? clock(settings.limits[key].ms) : 'Off'

  return (
    <div className="lay">
      <div className="top">
        <div className="round">
          <b>New Game</b>
        </div>
        <div className="spacer" />
        {props.canLoadLast && (
          <button className="ibtn" onClick={props.onLoadLast}>
            Load last game
          </button>
        )}
        <button
          className="ibtn"
          onClick={props.onSettings}
          aria-label="Settings"
        >
          ⚙<span className="word"> Settings</span>
        </button>
      </div>
      <div className="content">
        <div className="setup-grid">
          <div className="col">
            {props.notice && (
              <div className="notice">
                {props.notice}
                <button className="ibtn" onClick={props.onDismissNotice}>
                  Dismiss
                </button>
              </div>
            )}
            <div>
              <div className="setup-label">
                Players · in seat order, clockwise around the table
              </div>
              <div className="count">
                {COUNTS.map((n) => (
                  <button
                    key={n}
                    className={n === count ? 'on' : ''}
                    onClick={() => {
                      setCount(n)
                      if (speaker >= n) setSpeaker(0)
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="scroll grow">
              {seats.map((row, i) => (
                <div
                  key={i}
                  className={`seat ${i === speaker ? 'sp' : ''}`}
                  style={pc(row.colour)}
                >
                  <div className="seat-move">
                    <button
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      ▲
                    </button>
                    <button
                      aria-label="Move down"
                      disabled={i === count - 1}
                      onClick={() => move(i, 1)}
                    >
                      ▼
                    </button>
                  </div>
                  <div className="sn">
                    Seat
                    <br />
                    {i + 1}
                  </div>
                  <div className="swatches">
                    {COLOURS.map((colour) => (
                      <button
                        key={colour}
                        aria-label={colour}
                        className={`sw ${colour === row.colour ? 'on' : ''}`}
                        style={pc(colour)}
                        onClick={() => pickColour(i, colour)}
                      />
                    ))}
                  </div>
                  <input
                    className="fld name"
                    value={row.name}
                    placeholder={`Player ${i + 1}`}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                  <input
                    className="fld sel fac"
                    list="factions"
                    value={row.faction}
                    placeholder="Faction"
                    onChange={(e) => update(i, { faction: e.target.value })}
                  />
                  <button
                    className={`spk ${i === speaker ? 'on' : ''}`}
                    aria-label="Make speaker"
                    onClick={() => setSpeaker(i)}
                  >
                    ★
                  </button>
                </div>
              ))}
              <datalist id="factions">
                {FACTIONS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
          </div>
          <div
            className="pnl"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div className="pnl-h">Game</div>
            <div className="grow" style={{ padding: '16px 18px' }}>
              <div className="kv">
                <span>Players</span>
                <b>{count}</b>
              </div>
              <div className="kv">
                <span>Strategy cards each</span>
                <b>1</b>
              </div>
              <div className="kv">
                <span>Speaker</span>
                <b>{nameOf(speaker)}</b>
              </div>
              <div className="kv">
                <span>Time limits</span>
                <b
                  style={
                    settings.enforceLimits
                      ? { color: 'var(--warn)' }
                      : undefined
                  }
                >
                  {settings.enforceLimits ? 'Enabled' : 'Off'}
                </b>
              </div>
              {settings.enforceLimits && (
                <>
                  <div className="kv">
                    <span>Turn limit</span>
                    <b>{limit('turn')}</b>
                  </div>
                  <div className="kv" style={{ border: 'none' }}>
                    <span>Reaction window</span>
                    <b>{limit('reactionWindow')}</b>
                  </div>
                </>
              )}
              <div className="setup-help">
                Seat order is the physical ring. The <b>speaker ★</b> picks
                first in the strategy phase and votes last in the agenda phase.
              </div>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <button
                className="big lg"
                style={{ width: '100%' }}
                onClick={begin}
              >
                BEGIN GAME
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
