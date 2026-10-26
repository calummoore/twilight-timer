import type { Random } from './deal'

/**
 * The characters of a join code: the digits and the capital letters, without
 * the ones that look alike: 0 and O, and 1, I, and L.
 */
export const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const CODE_LENGTH = 6

/** A new random join code. */
export function newCode(random: Random): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    const at = Math.floor(random() * CODE_CHARS.length)
    code += CODE_CHARS[Math.min(CODE_CHARS.length - 1, Math.max(0, at))]
  }
  return code
}

/**
 * A code as a device typed it, in capitals, or null when it cannot be a code.
 * Letter case and spaces do not matter.
 */
export function parseCode(text: string): string | null {
  const code = text.replace(/\s/g, '').toUpperCase()
  if (code.length !== CODE_LENGTH) return null
  return [...code].every((c) => CODE_CHARS.includes(c)) ? code : null
}
