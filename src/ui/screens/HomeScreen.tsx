import { useState } from 'react'
import type { RecentGame } from '../../model/device-store'
import { gameSummary, lastActivity } from '../../model/summary'
import type { Game } from '../../model/types'
import { dateLabel, dayLabel } from '../format'
import { summaryText } from '../summary'

/** A game that a build before the server saved on this device. */
export interface SavedGame {
  /** The game in progress, or the last game. */
  slot: 'game' | 'last'
  /** The game, or null when it cannot be read. */
  game: Game | null
}

/**
 * The first screen: a new game, a join code, the games that this device
 * saved before games lived on the server, and the recent games.
 */
export function HomeScreen(props: {
  recent: RecentGame[]
  saved: SavedGame[]
  /** The device clock, for the day of each recent game. */
  now: number
  /** The line under the code field, or null. */
  joinError: string | null
  /** The line under the saved games when one could not be continued. */
  savedError: string | null
  /** A join or a continue waits for the server. */
  busy: boolean
  onNewGame: () => void
  onJoin: (text: string) => void
  onOpen: (code: string) => void
  onContinue: (slot: SavedGame['slot']) => void
  onDismiss: (slot: SavedGame['slot']) => void
  onSettings: () => void
}) {
  const [code, setCode] = useState('')

  return (
    <div className="lay">
      <div className="top">
        <div className="round">
          <b>TI4 Nexus</b>
        </div>
        <div className="spacer" />
        <button
          className="ibtn"
          onClick={props.onSettings}
          aria-label="Settings"
        >
          ⚙<span className="word"> Settings</span>
        </button>
      </div>
      <div className="content">
        <div className="home-grid">
          <div className="pnl">
            <div className="pnl-h">New game</div>
            <div className="pad">
              <div className="home-help">
                Set up the seats on this device. The game then gets a join code,
                and every player can join from their own phone.
              </div>
              <button
                className="big lg"
                style={{ width: '100%' }}
                onClick={props.onNewGame}
              >
                NEW GAME
              </button>
            </div>
          </div>
          <form
            className="pnl"
            onSubmit={(e) => {
              e.preventDefault()
              props.onJoin(code)
            }}
          >
            <div className="pnl-h">Join a game</div>
            <div className="pad">
              <div className="home-help">
                Enter the code from the table device, or scan the QR code on its
                Players &amp; devices screen.
              </div>
              <input
                className={`fld code ${code ? '' : 'empty'}`}
                value={code}
                placeholder="Join code"
                aria-label="Join code"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value)}
              />
              {props.joinError && (
                <div className="home-err" role="alert">
                  {props.joinError}
                </div>
              )}
              <button
                className="big lg"
                style={{ width: '100%', marginTop: 12 }}
                disabled={props.busy}
              >
                JOIN GAME
              </button>
            </div>
          </form>
        </div>
        {props.saved.length > 0 && (
          <SavedGames
            saved={props.saved}
            error={props.savedError}
            busy={props.busy}
            onContinue={props.onContinue}
            onDismiss={props.onDismiss}
          />
        )}
        {props.recent.length > 0 && (
          <div className="pnl" style={{ marginTop: 18 }}>
            <div className="pnl-h">Recent games on this device</div>
            <div className="pad" style={{ paddingBottom: 10 }}>
              {props.recent.map((game) => (
                <div key={game.code} className="recent">
                  <div className="code num">{game.code}</div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 650 }}>
                      {summaryText(game)}
                    </div>
                    <div className="d">{dayLabel(game.seenAt, props.now)}</div>
                  </div>
                  <button
                    className="ibtn"
                    onClick={() => props.onOpen(game.code)}
                  >
                    {game.phase === 'ended' ? 'Open' : 'Rejoin'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** The games that a build before the server saved, which get a code here. */
function SavedGames(props: {
  saved: SavedGame[]
  error: string | null
  busy: boolean
  onContinue: (slot: SavedGame['slot']) => void
  onDismiss: (slot: SavedGame['slot']) => void
}) {
  return (
    <div className="pnl" style={{ marginTop: 18 }}>
      <div className="pnl-h">Saved on this device</div>
      <div className="pad" style={{ paddingBottom: 10 }}>
        <div className="home-help">
          This device saved a game before games had join codes. Continue it to
          give it a code, so that every player can join.
        </div>
        {props.saved.map(({ slot, game }) =>
          game ? (
            <div key={slot} className="recent saved">
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 650 }}>
                  {summaryText(gameSummary(game, game.players.length))}
                </div>
                <div className="d">
                  Saved on this device, {dateLabel(lastActivity(game))}
                </div>
              </div>
              <button
                className="ibtn"
                disabled={props.busy}
                onClick={() => props.onContinue(slot)}
              >
                Continue
              </button>
            </div>
          ) : (
            <div key={slot} className="notice" role="alert">
              {slot === 'last'
                ? 'The last game saved on this device could not be read.'
                : 'The game saved on this device could not be read.'}
              <button className="ibtn" onClick={() => props.onDismiss(slot)}>
                Dismiss
              </button>
            </div>
          ),
        )}
        {props.error && (
          <div className="home-err" role="alert" style={{ marginBottom: 8 }}>
            {props.error}
          </div>
        )}
      </div>
    </div>
  )
}
