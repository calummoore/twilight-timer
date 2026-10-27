import { isFields } from './parse-fields'
import { parseActionInput, parseLimits, parseSeatValues } from './parse-parts'
import type { Command } from './protocol'
import { PAUSE_REASONS } from './types'

/** Reads a command from a device. Returns null when it cannot be read. */
export function parseCommand(raw: unknown): Command | null {
  if (!isFields(raw)) return null
  switch (raw.type) {
    case 'claim': {
      const { seat } = raw
      if (seat === null) return { type: raw.type, seat }
      if (typeof seat !== 'string') return null
      if (raw.values === undefined) return { type: raw.type, seat }
      const values = parseSeatValues(raw.values)
      return values && { type: raw.type, seat, values }
    }
    case 'edit': {
      const values = parseSeatValues(raw.values)
      if (!values || typeof raw.playerId !== 'string') return null
      const edit = { type: raw.type, playerId: raw.playerId, values }
      return raw.speaker === true ? { ...edit, speaker: true } : edit
    }
    case 'moveSeat':
      return typeof raw.playerId === 'string' && typeof raw.toId === 'string'
        ? { type: raw.type, playerId: raw.playerId, toId: raw.toId }
        : null
    case 'admin':
      return typeof raw.deviceId === 'string' && typeof raw.admin === 'boolean'
        ? { type: raw.type, deviceId: raw.deviceId, admin: raw.admin }
        : null
    case 'act': {
      const input = parseActionInput(raw.input)
      return input && { type: raw.type, input }
    }
    case 'pauseReason': {
      const reason = PAUSE_REASONS.find((r) => r === raw.reason) ?? null
      return reason !== null || raw.reason === null
        ? { type: raw.type, reason }
        : null
    }
    case 'limits': {
      const limits = parseLimits(raw.limits)
      const { enforceLimits } = raw
      return limits && typeof enforceLimits === 'boolean'
        ? { type: raw.type, enforceLimits, limits }
        : null
    }
    case 'start':
    case 'deal':
    case 'undo':
    case 'pause':
    case 'resume':
      return { type: raw.type }
    default:
      return null
  }
}
