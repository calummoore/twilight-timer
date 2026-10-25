import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { SEC, passAll, playStrategy, table, type Table } from './test-table'

/** Seats, clockwise: Jaz, Kira, Tom, Priya, Sam, Wren. Jaz is the speaker. */

function voters(t: Table): [string, string][] {
  const view = t.view().view
  return view.phase === 'agenda'
    ? view.voters.map((v) => [v.playerId, v.state])
    : []
}

describe('a speaker who leaves the game', () => {
  it('passes the token to the player on their left', () => {
    const t = table()
    t.act({ kind: 'cardPicked', playerId: 'jaz', card: 3 })
    t.wait(4 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'jaz' })
    t.wait(6 * SEC)
    const view = t.view()
    expect(view.speakerId).toBe('kira')
    expect(view.pickOrder).toEqual(['kira', 'tom', 'priya', 'sam', 'wren'])
    expect(view.voteOrder).toEqual(['tom', 'priya', 'sam', 'wren', 'kira'])
    // Kira was picking, so the pick clock runs on.
    expect(view.view).toMatchObject({ pickerId: 'kira', owners: {} })
    expect(view.timer).toMatchObject({ playerId: 'kira', elapsedMs: 10 * SEC })
  })

  it('passes the token around the table past a player who left', () => {
    const t = table(DEFAULT_SETTINGS, 'wren')
    t.act({ kind: 'playerRemoved', playerId: 'jaz' }) // on Wren's left
    t.act({ kind: 'playerRemoved', playerId: 'wren' })
    expect(t.view().speakerId).toBe('kira')
  })

  it('moves the vote clock when the new speaker order changes the voter', () => {
    const t = table()
    playStrategy(t)
    passAll(t)
    t.act({ kind: 'custodiansSet', removed: true })
    t.act({ kind: 'phaseStepped' }) // the agenda phase
    t.act({ kind: 'votingOpened' }) // Kira votes first
    t.wait(5 * SEC)
    t.act({ kind: 'playerRemoved', playerId: 'jaz' })
    // Kira holds the token now and votes last, so Tom votes first.
    expect(t.view().speakerId).toBe('kira')
    expect(voters(t)).toEqual([
      ['tom', 'now'],
      ['priya', 'waiting'],
      ['sam', 'waiting'],
      ['wren', 'waiting'],
      ['kira', 'waiting'],
    ])
    expect(t.view().entries.filter((e) => e.kind === 'vote')).toMatchObject([
      { playerId: 'kira', durationMs: 5 * SEC, running: false },
      { playerId: 'tom', running: true },
    ])
  })

  it('gets the token back when the removal is undone', () => {
    const t = table()
    t.act({ kind: 'playerRemoved', playerId: 'jaz' })
    t.undo()
    expect(t.view().speakerId).toBe('jaz')
  })

  it('hands the token on in the Politics window that they opened', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'turnEnded' }) // Tom
    t.act({ kind: 'turnEnded' }) // Wren
    t.act({ kind: 'strategyCardPlayed', card: 3 }) // Jaz plays Politics
    t.act({ kind: 'playerRemoved', playerId: 'jaz' })
    const view = t.view().view
    expect(view.phase === 'action' && view.reaction?.speakerChoice).toEqual({
      fromId: 'jaz',
      options: ['kira', 'tom', 'priya', 'sam', 'wren'],
      chosenId: 'kira',
    })
    t.act({ kind: 'reactionClosed' })
    // The next turn counts on from Jaz's place.
    expect(t.view().view).toMatchObject({ activeId: 'sam', reaction: null })
  })
})
