import { useState } from 'react'
import type { RecentGame } from '../../model/device-store'
import { dayLabel } from '../format'
import { summaryText } from '../summary'

/** The first screen: a new game, a join code, and the recent games. */
export function HomeScreen(props: {
  recent: RecentGame[]
  /** The device clock, for the day of each recent game. */
  now: number
  /** The line under the code field, or null. */
  joinError: string | null
  /** A join waits for the server. */
  busy: boolean
  onNewGame: () => void
  onJoin: (text: string) => void
  onOpen: (code: string) => void
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
                Enter the code from a device in the game, or scan the QR code on
                its Players &amp; devices screen.
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
