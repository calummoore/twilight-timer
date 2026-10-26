import { useState } from 'react'
import { dealFactions } from '../../model/deal'
import { NAALU, type FactionId } from '../../model/factions'
import {
  COLOURS,
  DEFAULT_PLAYERS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Colour,
} from '../../model/rules'
import type { Expansions, Settings } from '../../model/settings'
import type { Player } from '../../model/types'
import { moveItem, movedIndex } from '../listMove'
import { SetupGamePanel, type CreateFailure } from './SetupGamePanel'
import type { SeatRow } from './SetupSeat'
import { SetupSeatList } from './SetupSeatList'

const COUNTS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => MIN_PLAYERS + i,
)

export function SetupScreen(props: {
  settings: Settings
  /** Create game waits for the server. */
  creating: boolean
  /** Why the last Create game made no game, or null. */
  failure: CreateFailure | null
  /** Reloads the page, after a reload that did not bring the new build. */
  onReload: () => void
  onBack: () => void
  onSettings: () => void
  /** Saves changed settings, for example the expansions in play. */
  onSettingsChange: (settings: Settings) => void
  onCreate: (players: Player[], speakerId: string) => void
}) {
  const { expansions } = props.settings
  const [count, setCount] = useState(DEFAULT_PLAYERS)
  const [rows, setRows] = useState<SeatRow[]>(() =>
    COLOURS.map((colour, id) => ({ id, name: '', colour, factionId: null })),
  )
  const [speaker, setSpeaker] = useState(0)
  const seats = rows.slice(0, count)
  const nameOf = (i: number) => seats[i]?.name.trim() || `Player ${i + 1}`
  const naalu = seats.findIndex((row) => row.factionId === NAALU)
  // The game begins only when every seat has a faction.
  const factionsMissing = seats.some((row) => row.factionId === null)

  const update = (i: number, patch: Partial<SeatRow>) =>
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

  // The random source runs in the tap, not in a state updater, because
  // React can run an updater twice.
  const deal = () => {
    const held = rows.map((row) => row.factionId)
    const dealt = dealFactions(held, count, expansions, Math.random)
    setRows(rows.map((row, i) => ({ ...row, factionId: dealt[i] ?? null })))
  }

  const changeExpansions = (next: Expansions) =>
    props.onSettingsChange({ ...props.settings, expansions: next })

  // A row moves to another seat, and the rows between shift by one. The
  // speaker star stays with its player.
  const moveRow = (from: number, to: number) => {
    if (from === to || Math.min(from, to) < 0 || Math.max(from, to) >= count) {
      return
    }
    setRows((all) => moveItem(all, from, to))
    setSpeaker((at) => movedIndex(at, from, to))
  }

  // Create game is off while a seat is empty, so every seat has a faction.
  const create = () => {
    const players: Player[] = []
    for (const [i, { colour, factionId }] of seats.entries()) {
      if (factionId === null) return
      players.push({ id: `p${i + 1}`, name: nameOf(i), colour, factionId })
    }
    props.onCreate(players, `p${speaker + 1}`)
  }

  return (
    <div className="lay">
      <div className="top">
        <div className="round">
          <b>New Game</b>
        </div>
        <div className="spacer" />
        <button className="ibtn" onClick={props.onBack}>
          ✕ Back
        </button>
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
            <SetupSeatList
              seats={seats}
              speaker={speaker}
              expansions={expansions}
              onMoveRow={moveRow}
              onColour={pickColour}
              onName={(i, name) => update(i, { name })}
              onFaction={pickFaction}
              onSpeaker={setSpeaker}
            />
          </div>
          <SetupGamePanel
            count={count}
            speakerName={nameOf(speaker)}
            naaluName={naalu < 0 ? null : nameOf(naalu)}
            factionsMissing={factionsMissing}
            settings={props.settings}
            creating={props.creating}
            failure={props.failure}
            onReload={props.onReload}
            onExpansions={changeExpansions}
            onDeal={deal}
            onCreate={create}
          />
        </div>
      </div>
    </div>
  )
}
