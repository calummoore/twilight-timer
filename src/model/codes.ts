/** Join codes and the links that hold them. */

/** Letters and digits without look-alikes such as 0, O, 1, I, and L. */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const CODE_LENGTH = 6

/** Makes a code. `random` returns a number from 0 up to, not including, 1. */
export function makeCode(random: () => number): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(random() * CODE_ALPHABET.length)
    code += CODE_ALPHABET[Math.min(index, CODE_ALPHABET.length - 1)]
  }
  return code
}

/** Reads a typed code: case, spaces, and dashes do not matter. */
export function readCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '')
  if (code.length !== CODE_LENGTH) return null
  return [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null
}

export type Link =
  | { kind: 'join'; code: string | null }
  | { kind: 'table'; code: string; secret: string }

/**
 * Reads the route of the page. `/join/{code}` and `/join` open player
 * mode. `/table/{code}#{secret}` opens table mode. The secret stays in the
 * fragment, so it never reaches a server log.
 */
export function parseLink(pathname: string, hash: string): Link | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'join' && parts.length <= 2) {
    return { kind: 'join', code: parts[1] ? readCode(parts[1]) : null }
  }
  if (parts[0] === 'table' && parts.length === 2) {
    const code = readCode(parts[1] ?? '')
    const secret = hash.replace(/^#/, '')
    return code && /^[0-9a-f]{32,}$/.test(secret)
      ? { kind: 'table', code, secret }
      : null
  }
  return null
}

export function joinPath(code: string): string {
  return `/join/${code}`
}

export function tablePath(code: string, secret: string): string {
  return `/table/${code}#${secret}`
}
