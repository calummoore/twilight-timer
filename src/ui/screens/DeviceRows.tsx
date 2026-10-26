import { isLastAdmin } from '../../model/devices'
import { factionName } from '../../model/factions'
import type { DeviceView } from '../../model/protocol'
import type { Player } from '../../model/types'
import { pc } from '../colour'
import { Toggle } from '../controls'

/**
 * One row per seat with the device that holds it, then the table devices.
 * Every row has the admin switch of its device. Only an admin device with a
 * connection uses the switches, and the last admin keeps its switch on.
 */
export function DeviceRows(props: {
  players: Player[]
  devices: DeviceView[]
  you: string | null
  /** This device may give admin and take it away now. */
  mayChange: boolean
  onAdmin: (deviceId: string, admin: boolean) => void
}) {
  const { players, devices } = props
  const holder = (id: string) => devices.find((d) => d.seat === id)
  const held = players.filter((p) => holder(p.id)).length
  const tables = devices.filter((d) => d.seat === null)
  const row = (device: DeviceView, player?: Player) => (
    <DeviceRow
      key={device.id}
      device={device}
      player={player}
      you={device.id === props.you}
      locked={!props.mayChange || isLastAdmin(devices, device)}
      onAdmin={(on) => props.onAdmin(device.id, on)}
    />
  )

  return (
    <div>
      <div className="setup-label">
        Seats and devices · {held} of {players.length} seats have a device
      </div>
      {players.map((p) => {
        const device = holder(p.id)
        return device ? (
          row(device, p)
        ) : (
          <div key={p.id} className="dev-row" style={pc(p.colour)}>
            <i />
            <div>
              <div className="nm">{p.name}</div>
              <div className="fc">{factionName(p.factionId)}</div>
            </div>
            <div className="st no">No device</div>
            <div className="adm" />
          </div>
        )
      })}
      {tables.length > 0 && (
        <>
          <div className="setup-label" style={{ marginTop: 18 }}>
            Table devices
          </div>
          {tables.map((device) => row(device))}
        </>
      )}
    </div>
  )
}

function DeviceRow(props: {
  device: DeviceView
  /** The player of the seat, or undefined for a table device. */
  player: Player | undefined
  you: boolean
  /** The switch shows, but this device may not use it. */
  locked: boolean
  onAdmin: (admin: boolean) => void
}) {
  const { device, player } = props
  const about = player
    ? factionName(player.factionId)
    : device.admin
      ? 'Acts for every player'
      : 'Watches the game'
  return (
    <div
      className={`dev-row ${player ? '' : 'table'}`}
      style={player ? pc(player.colour) : { '--pc': 'var(--accent)' }}
    >
      <i />
      <div>
        <div className="nm">
          {player ? player.name : 'Table device'}
          {props.you && <span className="you-tag">This device</span>}
        </div>
        <div className="fc">{about}</div>
      </div>
      {device.connected ? (
        <div className="st ok">● Connected</div>
      ) : (
        <div className="st away">Away</div>
      )}
      <div className="adm">
        Admin
        <Toggle
          label={`Admin: ${player ? player.name : 'Table device'}`}
          on={device.admin}
          disabled={props.locked}
          onChange={props.onAdmin}
        />
      </div>
    </div>
  )
}
