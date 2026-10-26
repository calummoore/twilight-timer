import { isFields } from './parse-fields'

/** A device in a game: one browser, as every device of the game sees it. */
export interface Device {
  /** The id that the other devices see. */
  id: string
  /** The player that the device acts for, or null for a table device. */
  seat: string | null
  admin: boolean
}

/**
 * A device as the server keeps it. The token is the secret of its browser,
 * so it never leaves the server.
 */
export interface Member extends Device {
  token: string
}

export function memberOf(
  members: readonly Member[],
  token: string,
): Member | undefined {
  return members.find((m) => m.token === token)
}

/**
 * The device of `token` takes `seat`, or becomes a table device with null. A
 * device that has not joined joins with `admin`, which only the device that
 * created the game gets. A device that has joined keeps its admin. The device
 * that held the seat becomes a table device, and keeps its admin.
 */
export function takeSeat(
  members: readonly Member[],
  token: string,
  seat: string | null,
  admin = false,
): Member[] {
  const freed = members.map((m) =>
    seat !== null && m.seat === seat && m.token !== token
      ? { ...m, seat: null }
      : m,
  )
  if (!memberOf(members, token)) {
    const id = `d${members.length + 1}`
    return [...freed, { id, token, seat, admin }]
  }
  return freed.map((m) => (m.token === token ? { ...m, seat } : m))
}

/**
 * Gives a device admin or takes it away. Returns null when no device has the
 * id, when its admin does not change, or when no admin would be left.
 */
export function setAdmin(
  members: readonly Member[],
  id: string,
  admin: boolean,
): Member[] | null {
  const target = members.find((m) => m.id === id)
  if (!target || target.admin === admin) return null
  const next = members.map((m) => (m.id === id ? { ...m, admin } : m))
  return next.some((m) => m.admin) ? next : null
}

/** Whether the device is the only admin, so that it cannot lose admin. */
export function isLastAdmin(
  devices: readonly Device[],
  device: Device,
): boolean {
  return device.admin && devices.filter((d) => d.admin).length === 1
}

/**
 * Whether no admin device has a connection now. Then a seated device may
 * switch its own admin on, so that the table can finish the game.
 */
export function adminsAway(
  devices: readonly { admin: boolean; connected: boolean }[],
): boolean {
  return !devices.some((d) => d.admin && d.connected)
}

/** The device without its token, as the other devices see it. */
export function publicDevice({ id, seat, admin }: Member): Device {
  return { id, seat, admin }
}

/** A device id as the server gives it, and a token as a browser makes it. */
const ID = /^d[1-9][0-9]*$/
const TOKEN = /^[A-Za-z0-9_-]{16,128}$/

export function parseToken(raw: unknown): string | null {
  return typeof raw === 'string' && TOKEN.test(raw) ? raw : null
}

export function parseDevice(raw: unknown): Device | null {
  if (!isFields(raw)) return null
  const { id, seat, admin } = raw
  if (typeof id !== 'string' || !ID.test(id)) return null
  if (seat !== null && typeof seat !== 'string') return null
  return typeof admin === 'boolean' ? { id, seat, admin } : null
}

export function parseMember(raw: unknown): Member | null {
  const device = parseDevice(raw)
  const token = isFields(raw) ? parseToken(raw.token) : null
  return device && token ? { ...device, token } : null
}
