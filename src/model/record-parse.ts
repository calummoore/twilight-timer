import { parseGame } from './parse'
import { isFields, isNumber } from './parse-util'
import type { Answer, DeviceEntry, SeatPrivate, SharedRecord } from './share'
import { parseAnswer, parsePrivate, parseRole } from './share-parse'

/**
 * Narrows the stored record of a shared game. Returns null when it does
 * not parse, so that the server can refuse it instead of crashing.
 */
export function parseRecord(raw: unknown): SharedRecord | null {
  if (!isFields(raw) || raw.version !== 1) return null
  const { gameId, code, closed, rev, tableSecretHash } = raw
  const game = parseGame(raw.game)
  const priv = mapOf(raw.private, parsePrivate)
  const answered = mapOf<Answer>(raw.answered, parseAnswer)
  const devices = mapOf(raw.devices, parseDevice)
  const seats = mapOf(raw.seats, text)
  const moves = mapOf(raw.moves, text)
  if (typeof gameId !== 'string' || typeof code !== 'string') return null
  if (typeof closed !== 'boolean' || !isNumber(rev)) return null
  if (typeof tableSecretHash !== 'string' || !game) return null
  if (!priv || !answered || !devices || !seats || !moves) return null
  return {
    version: 1,
    gameId,
    code,
    closed,
    rev,
    game,
    private: priv satisfies Record<string, SeatPrivate>,
    answered,
    devices,
    tableSecretHash,
    seats,
    moves,
  }
}

function parseDevice(raw: unknown): DeviceEntry | null {
  if (!isFields(raw) || typeof raw.secretHash !== 'string') return null
  const role = parseRole(raw.role)
  const { seat } = raw
  if (!role || (seat !== null && typeof seat !== 'string')) return null
  return { role, secretHash: raw.secretHash, seat }
}

function text(raw: unknown): string | null {
  return typeof raw === 'string' ? raw : null
}

/** Parses each value of an object, or returns null when any is not valid. */
function mapOf<T>(
  raw: unknown,
  parse: (item: unknown) => T | null,
): Record<string, T> | null {
  if (!isFields(raw)) return null
  const out: Record<string, T> = {}
  for (const [key, value] of Object.entries(raw)) {
    const parsed = parse(value)
    if (parsed === null) return null
    out[key] = parsed
  }
  return out
}
