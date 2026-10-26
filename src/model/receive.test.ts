import { describe, expect, it } from 'vitest'
import { receive, type Caller } from './receive'
import { BUILD, HOST, OLD_BUILD } from './test-room'

/** A connection before its hello. */
const NEW: Caller = { token: null, build: null }
/** A connection whose hello named the build of the server. */
const SAME: Caller = { token: HOST, build: BUILD }
/** A connection whose hello named the build before, from before a deploy. */
const OLD: Caller = { token: HOST, build: OLD_BUILD }
/** A connection from a build before builds had ids: a token and no build. */
const LEGACY: Caller = { token: HOST, build: null }

const hello = (build?: unknown) => ({ type: 'hello', token: HOST, build })
const undo = { type: 'command', rev: 4, command: { type: 'undo' } }

describe('what the server does with a hello', () => {
  it('keeps the token and the build of a page of its own build', () => {
    for (const caller of [NEW, SAME, OLD]) {
      expect(receive(hello(BUILD), BUILD, caller)).toEqual({
        type: 'hello',
        token: HOST,
        build: BUILD,
      })
    }
  })

  it('answers a page of another build with outdated', () => {
    expect(receive(hello(OLD_BUILD), BUILD, NEW)).toEqual({ type: 'outdated' })
    // A later build may change the hello. Its build still reads first.
    const changed = { type: 'hello', build: OLD_BUILD, device: { id: 1 } }
    expect(receive(changed, BUILD, NEW)).toEqual({ type: 'outdated' })
  })

  it('ignores a hello without a build, whose page cannot read outdated', () => {
    for (const build of [undefined, '', 7]) {
      expect(receive(hello(build), BUILD, NEW)).toEqual({ type: 'ignore' })
    }
  })

  it('ignores a hello of its own build that it cannot read', () => {
    const broken = { type: 'hello', token: 'short', build: BUILD }
    expect(receive(broken, BUILD, NEW)).toEqual({ type: 'ignore' })
  })
})

describe('what the server does with a command', () => {
  it('applies a command on a connection of its own build', () => {
    expect(receive(undo, BUILD, SAME)).toEqual({
      type: 'command',
      token: HOST,
      rev: 4,
      command: { type: 'undo' },
    })
  })

  it('answers a connection of another build with outdated, whatever it sends', () => {
    for (const caller of [OLD, LEGACY]) {
      expect(receive(undo, BUILD, caller)).toEqual({ type: 'outdated' })
      const unknown = { type: 'command', rev: 4, command: { type: 'teleport' } }
      expect(receive(unknown, BUILD, caller)).toEqual({ type: 'outdated' })
    }
  })

  it('ignores a command before the hello, and a message it cannot read', () => {
    expect(receive(undo, BUILD, NEW)).toEqual({ type: 'ignore' })
    const broken = { type: 'command', rev: -1, command: { type: 'undo' } }
    for (const raw of [broken, { type: 'teleport' }, 'ping', null]) {
      expect(receive(raw, BUILD, SAME)).toEqual({ type: 'ignore' })
    }
  })
})
