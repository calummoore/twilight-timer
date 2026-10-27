import { isLastAdmin } from '../../model/devices'
import type { DeviceView } from '../../model/protocol'
import type { Seat } from '../../model/types'
import { listPlaces } from '../listMove'
import { useDragReorder, type Places } from '../useDragReorder'
import { DeviceRow } from './DeviceRow'

/**
 * One row per seat with the device that holds it, then the table devices.
 * Every row has the admin switch of its device. A switch is on only where
 * the rights allow the change, and the last admin keeps its switch on. A
 * seat row has Edit when this device may edit the seat. Before Start game,
 * an admin device drags a seat row by its handle to the place of another,
 * and the rows between shift by one.
 */
export function DeviceRows(props: {
  players: Seat[]
  devices: DeviceView[]
  you: string | null
  /** Whether this device may switch the admin of a device on or off now. */
  mayAdmin: (deviceId: string, admin: boolean) => boolean
  onAdmin: (deviceId: string, admin: boolean) => void
  /** Whether this device may edit the seat now. */
  mayEdit: (playerId: string) => boolean
  onEdit: (playerId: string) => void
  /** This device may move seats now. */
  mayMove: boolean
  onMove: (playerId: string, toId: string) => void
}) {
  const { players, devices } = props
  const holder = (id: string) => devices.find((d) => d.seat === id)
  const held = players.filter((p) => holder(p.id)).length
  const tables = devices.filter((d) => d.seat === null)
  const index = (id: string) => players.findIndex((p) => p.id === id)
  // The drag hook works with the ids of the seats. The rows between shift
  // by one, as the setup rows do.
  const arrange = (heldId: string, targetId: string): Places => {
    const byIndex = listPlaces(index(heldId), index(targetId))
    const places = new Map<string, string>()
    for (const [from, to] of byIndex) {
      const a = players[Number(from)]
      const b = players[Number(to)]
      if (a && b) places.set(a.id, b.id)
    }
    return places
  }
  const drag = useDragReorder({
    holdMs: null,
    canDrag: () => props.mayMove && players.length > 1,
    arrange,
    onDrop: props.onMove,
  })
  const dragging = drag.heldId !== null
  const locked = (device: DeviceView) =>
    !props.mayAdmin(device.id, !device.admin) || isLastAdmin(devices, device)

  return (
    <div>
      <div className="setup-label">
        Seats and devices · {held} of {players.length} seats have a device
      </div>
      <div className={`dev-list ${dragging ? 'dragging' : ''}`} {...drag.scope}>
        {players.map((p) => {
          const device = holder(p.id)
          return (
            <DeviceRow
              key={p.id}
              seat={p}
              device={device}
              you={!!device && device.id === props.you}
              locked={!device || locked(device)}
              onAdmin={(on) => device && props.onAdmin(device.id, on)}
              onEdit={
                props.mayEdit(p.id) ? () => props.onEdit(p.id) : undefined
              }
              onGrip={props.mayMove ? (e) => drag.press(p.id, e) : undefined}
              held={drag.heldId === p.id}
              shiftY={drag.shift(p.id)?.y ?? null}
            />
          )
        })}
      </div>
      {tables.length > 0 && (
        <>
          <div className="setup-label" style={{ marginTop: 18 }}>
            Table devices
          </div>
          {tables.map((device) => (
            <DeviceRow
              key={device.id}
              seat={undefined}
              device={device}
              you={device.id === props.you}
              locked={locked(device)}
              onAdmin={(on) => props.onAdmin(device.id, on)}
            />
          ))}
        </>
      )}
    </div>
  )
}
