import { useState } from 'react'
import { FACTIONS, NAALU, type FactionId } from '../../model/factions'
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
import { SetupGamePanel } from './SetupGamePanel'

interface Row {
  name: string
  colour: Colour
  factionId: FactionId | null
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
    COLOURS.map((colour) => ({ name: '', colour, factionId: null })),
  )
  const [speaker, setSpeaker] = useState(0)
  const seats = rows.slice(0, count)
  const nameOf = (i: number) => seats[i]?.name.trim() || `Player ${i + 1}`
  const naalu = seats.findIndex((row) => row.factionId === NAALU)
  // The game begins only when every seat has a faction.
  const factionsMissing = seats.some((row) => row.factionId === null)

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

  // Factions stay unique too: taking a faction swaps it with its holder.
  const pickFaction = (i: number, factionId: FactionId | null) =>
    setRows((all) => {
      const holder = all.findIndex(
        (row) => factionId !== null && row.factionId === factionId,
      )
      const mine = all[i]?.factionId ?? null
      return all.map((row, j) =>
        j === i
          ? { ...row, factionId }
          : j === holder
            ? { ...row, factionId: mine }
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
      factionId: row.factionId,
    }))
    props.onBegin(players, `p${speaker + 1}`)
  }

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
                  <select
                    className={`fld sel fac ${row.factionId ? '' : 'none'}`}
                    aria-label="Faction"
                    value={row.factionId ?? ''}
                    onChange={(e) => {
                      const faction = FACTIONS.find(
                        (f) => f.id === e.target.value,
                      )
                      pickFaction(i, faction?.id ?? null)
                    }}
                  >
                    <option value="" disabled>
                      Faction
                    </option>
                    {FACTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className={`spk ${i === speaker ? 'on' : ''}`}
                    aria-label="Make speaker"
                    onClick={() => setSpeaker(i)}
                  >
                    ★
                  </button>
                </div>
              ))}
            </div>
          </div>
          <SetupGamePanel
            count={count}
            speakerName={nameOf(speaker)}
            naaluName={naalu < 0 ? null : nameOf(naalu)}
            factionsMissing={factionsMissing}
            settings={props.settings}
            onBegin={begin}
          />
        </div>
      </div>
    </div>
  )
}
