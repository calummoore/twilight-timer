import { seatFaction } from '../seatText'
import type { DeviceView } from '../../model/protocol'
import type { Seat } from '../../model/types'
import { pc } from '../colour'
import { NetBar } from '../controls'

/**
 * Which player this device is: one tap takes a seat, also one that another
 * device holds, or joins as a table device, which is a viewer until an admin
 * device gives it admin. The device that created the game joins here too,
 * with admin. It also changes the seat of a device in the game.
 */
export function ClaimScreen(props: {
  code: string
  /** The seats in clockwise order, as the seat moves of the game left them. */
  players: Seat[]
  devices: DeviceView[]
  /** This device, when it has joined the game. */
  device: DeviceView | undefined
  /**
   * This device is an admin, or gets admin when it joins, as the device that
   * created the game does. So it acts for every player, also in a seat.
   */
  admin: boolean
  connected: boolean
  onSeat: (seat: string | null) => void
  onCancel: () => void
}) {
  const { device } = props
  const holder = (id: string) => props.devices.find((d) => d.seat === id)

  return (
    <div className="lay settings-screen">
      <div className="top">
        <div className="round">
          <b>Join game</b> · <span className="num">{props.code}</span>
        </div>
        <div className="spacer" />
        <button className="ibtn" onClick={props.onCancel}>
          ✕ Cancel
        </button>
      </div>
      {!props.connected && <NetBar />}
      <div className="content">
        <div className="claim-grid">
          <div>
            <div className="h1" style={{ fontSize: 25 }}>
              Which player are you?
            </div>
            <div className="h1s" style={{ marginBottom: 18 }}>
              {props.admin ? (
                <>
                  Take your seat. This device is an admin, so it also acts for
                  every player.
                </>
              ) : (
                <>
                  Take your seat. This device then acts for that player, when it
                  is their turn.
                </>
              )}
            </div>
            {props.players.map((p, i) => {
              const held = holder(p.id)
              const you = !!device && held?.id === device.id
              return (
                <button
                  key={p.id}
                  className={`seat-pick ${you ? 'you' : ''}`}
                  style={pc(p.colour)}
                  disabled={!props.connected || you}
                  onClick={() => props.onSeat(p.id)}
                >
                  <i />
                  <div>
                    <div className="nm">{p.name}</div>
                    <div className="fc">
                      {seatFaction(p)} · Seat {i + 1}
                    </div>
                  </div>
                  <div className={`tk ${held && !you ? 'held' : ''}`}>
                    {you
                      ? '✓ You'
                      : held
                        ? held.connected
                          ? 'Held · connected'
                          : 'Held · away'
                        : 'Free'}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="pnl" style={{ alignSelf: 'start' }}>
            <div className="pnl-h">Join as table device</div>
            <div className="pad">
              <div className="home-help">
                {props.admin ? (
                  <>
                    A table device has no seat. It acts for every player, like
                    the iPad in the middle of the table.
                  </>
                ) : (
                  <>
                    A table device has no seat. It joins as a viewer, and an
                    admin can give it admin on Players &amp; devices, so that it
                    acts for every player like the iPad in the middle of the
                    table.
                  </>
                )}
              </div>
              <button
                className="big lg"
                style={{ width: '100%' }}
                disabled={
                  !props.connected || (!!device && device.seat === null)
                }
                onClick={() => props.onSeat(null)}
              >
                JOIN AS TABLE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
