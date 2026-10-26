import { describe, expect, it } from 'vitest'
import { CODE_CHARS, newCode, parseCode } from './code'

/** A fixed sequence in place of `Math.random`. */
function sequence(...values: number[]) {
  let i = 0
  return () => values[i++ % values.length] ?? 0
}

describe('join codes', () => {
  it('makes six characters from the code alphabet', () => {
    expect(newCode(sequence(0))).toBe('222222')
    expect(newCode(sequence(0.999999))).toBe('ZZZZZZ')
    expect(newCode(sequence(0, 0.5, 0.25, 0.75, 0.1, 0.9))).toBe('2H9S5W')
  })

  it('stays in the alphabet when the source gives 1', () => {
    expect(newCode(sequence(1))).toBe('ZZZZZZ')
  })

  it('leaves out the characters that look alike', () => {
    for (const c of '01OIL') expect(CODE_CHARS).not.toContain(c)
    expect(new Set(CODE_CHARS).size).toBe(CODE_CHARS.length)
  })

  it('accepts a code in any case, with spaces', () => {
    expect(parseCode('7qk2hn')).toBe('7QK2HN')
    expect(parseCode(' 7QK 2HN ')).toBe('7QK2HN')
    expect(parseCode('7QK2HN')).toBe('7QK2HN')
  })

  it('rejects a code of the wrong length or with other characters', () => {
    expect(parseCode('7QK2H')).toBeNull()
    expect(parseCode('7QK2HNX')).toBeNull()
    expect(parseCode('7QK2H0')).toBeNull()
    expect(parseCode('7QK2HO')).toBeNull()
    expect(parseCode('7QK-2H')).toBeNull()
    expect(parseCode('')).toBeNull()
  })
})
