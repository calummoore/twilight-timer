import type { Notice } from '../../model/protocol'

/** The card of each notice: its heading, its line, and its button. */
const CARDS: Record<
  Notice,
  { heading: string; line: string; button: 'HOME' | 'RELOAD' }
> = {
  missing: {
    heading: 'No game has this code',
    line: 'Check the code on a device in the game, and join again from Home.',
    button: 'HOME',
  },
  outdated: {
    heading: 'A new version is live',
    line: 'Reload the page.',
    button: 'RELOAD',
  },
  unreadable: {
    heading: 'This game needs a newer version of the app',
    line: 'The game stays on the server. Open it again after the next update.',
    button: 'HOME',
  },
}

/**
 * Between Join game, or a link, and the game: the device connects. A notice
 * ends the connection: a link with a code that no game has, a page that a
 * reload did not bring to the version of the server, or a game that the
 * server holds but cannot read.
 */
export function OpeningScreen(props: {
  code: string
  /** The notice of the server, or null while the device connects. */
  notice: Notice | null
  onHome: () => void
  onReload: () => void
}) {
  const card = props.notice && CARDS[props.notice]
  return (
    <div className="lay">
      <div className="top">
        <div className="round">
          <b>Join game</b> · <span className="num">{props.code}</span>
        </div>
        <div className="spacer" />
        <button className="ibtn" onClick={props.onHome}>
          ✕ Cancel
        </button>
      </div>
      <div className="content open-wait">
        <div className="open-card">
          {card ? (
            <>
              <div className="h1" style={{ fontSize: 25 }}>
                {card.heading}
              </div>
              <div className="h1s">{card.line}</div>
              <button
                className="big lg"
                style={{ width: '100%' }}
                onClick={
                  card.button === 'RELOAD' ? props.onReload : props.onHome
                }
              >
                {card.button}
              </button>
            </>
          ) : (
            <div className="lobby-wait" role="status">
              <i />
              Opening the game
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
