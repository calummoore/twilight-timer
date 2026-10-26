/**
 * Between Join game, or a link, and the game: the device connects. A link
 * with a code that no game has says so.
 */
export function OpeningScreen(props: {
  code: string
  missing: boolean
  onHome: () => void
}) {
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
          {props.missing ? (
            <>
              <div className="h1" style={{ fontSize: 25 }}>
                No game has this code
              </div>
              <div className="h1s">
                Check the code on a device in the game, and join again from
                Home.
              </div>
              <button
                className="big lg"
                style={{ width: '100%' }}
                onClick={props.onHome}
              >
                HOME
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
