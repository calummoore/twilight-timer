/** Small narrowing helpers for data that enters as `unknown`. */

export type Fields = Record<string, unknown>

export function isFields(raw: unknown): raw is Fields {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
}

export function isNumber(raw: unknown): raw is number {
  return typeof raw === 'number' && Number.isFinite(raw)
}

export function bool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback
}

/** Parses each item, or returns null when any item is not valid. */
export function listOf<T>(
  raw: unknown,
  parse: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(raw)) return null
  const out: T[] = []
  for (const item of raw) {
    const parsed = parse(item)
    if (parsed === null) return null
    out.push(parsed)
  }
  return out
}
