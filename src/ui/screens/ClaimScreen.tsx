import { useState } from 'react'
import type { DeviceView } from '../../model/protocol'
import type { Expansions } from '../../model/settings'
import type { Seat, SeatValues } from '../../model/types'
import { pc } from '../colour'
import { NetBar } from '../controls'
import { seatFaction } from '../seatText'
import { SeatEditDialog } from './SeatEditDialog'

/**
 * Which player this device is. A tap on a seat opens its name, colour, and
 * faction in a dialog, and Take seat takes the seat with them, also a seat
 * that another device holds. Or the device joins as a table device, which
 * is a viewer until an admin device gives it admin. The device that created
 * the game joins here too, with admin. It also changes the seat of a device
 * in the game.
 */
export function ClaimScreen(props: {
  code: string
  players: Seat[]
  devices: DeviceView[]
  expansions: Expansions
  /** The game has started, so only the name of a seat still changes. */
  started: boolean
  /** This device, when it has joined the game. */
  device: DeviceView | undefined
  /**
   * This device is an admin, or gets admin when it joins, as the device that
   * created the game does. So it acts for every player, also in a seat, and
   * it takes a colour or a faction that another seat holds.
   */
  admin: boolean
  connected: boolean
  onSeat: (seat: string | null, values?: SeatValues) => void
  onCancel: () => void
}) {
  const { device, players } = props
  const [openId, setOpenId] = useState<string | null>(null)
  const open = players.find((p) => p.id === openId)
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
            {players.map((p, i) => {
              const held = holder(p.id)
              const you = !!device && held?.id === device.id
              return (
                <div
                  key={p.id}
                  className={`seat-pick ${you ? 'you' : ''}`}
                  style={pc(p.colour)}
                >
                  <button
                    className="head"
                    disabled={!props.connected || you}
                    onClick={() => setOpenId(p.id)}
                  >
                    <i />
                    <div>
                      <div className="nm">{p.name}</div>
                      <div className={`fc ${p.factionId ? '' : 'none'}`}>
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
                </div>
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
      {open && (
        <SeatEditDialog
          key={open.id}
          kind="claim"
          seat={open}
          seats={players}
          place={players.indexOf(open) + 1}
          expansions={props.expansions}
          takes={props.admin}
          started={props.started}
          speaker={false}
          maySpeaker={false}
          connected={props.connected}
          onSave={(values) => {
            setOpenId(null)
            props.onSeat(open.id, values)
          }}
          onCancel={() => setOpenId(null)}
        />
      )}
    </div>
  )
}
