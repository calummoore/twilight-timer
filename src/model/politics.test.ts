import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { SEC, playStrategy, table, type Table } from './test-table'

const OTHERS = ['kira', 'tom', 'priya', 'sam', 'wren']

/** Tom and Wren end their turns, then Jaz plays Politics after 20 seconds. */
function playPolitics(speakerId = 'jaz') {
  const t = table(DEFAULT_SETTINGS, speakerId)
  playStrategy(t)
  t.act({ kind: 'turnEnded' }) // Tom, Leadership
  t.act({ kind: 'turnEnded' }) // Wren, Diplomacy
  t.wait(20 * SEC)
  t.act({ kind: 'strategyCardPlayed' })
  return t
}

function reaction(t: Table) {
  const view = t.view().view
  return view.phase === 'action' ? view.reaction : null
}

describe('Politics reaction window', () => {
  it('offers the token to everyone but the speaker', () => {
    const t = playPolitics()
    expect(reaction(t)).toMatchObject({
      card: 3,
      byId: 'jaz',
      speakerChoice: { fromId: 'jaz', options: OTHERS, chosenId: null },
    })
  })

  it('lets the Politics player take the token from another speaker', () => {
    const t = playPolitics('tom')
    expect(reaction(t)?.speakerChoice?.options).toEqual([
      'jaz',
      'kira',
      'priya',
      'sam',
      'wren',
    ])
    expect(t.act({ kind: 'speakerMoved', playerId: 'jaz' })).toBe(true)
    expect(t.view().speakerId).toBe('jaz')
    expect(reaction(t)?.speakerChoice?.chosenId).toBe('jaz')
  })

  it('moves the token and charges the window to nobody', () => {
    const t = playPolitics()
    t.wait(5 * SEC)
    t.act({ kind: 'speakerMoved', playerId: 'tom' })
    t.wait(5 * SEC)
    expect(t.view().timer).toMatchObject({
      kind: 'reaction',
      playerId: null,
      elapsedMs: 10 * SEC,
    })
    expect(reaction(t)).toMatchObject({
      pausedTurnMs: 20 * SEC,
      speakerChoice: { chosenId: 'tom' },
    })
    t.act({ kind: 'reactionClosed' })
    t.wait(3 * SEC)
    t.act({ kind: 'turnEnded' })
    const view = t.view()
    const closed = view.entries.filter((e) => !e.running)
    expect(closed.at(-2)).toMatchObject({
      kind: 'reaction',
      playerId: null,
      durationMs: 10 * SEC,
      card: 3,
    })
    expect(closed.at(-1)).toMatchObject({
      kind: 'turn',
      playerId: 'jaz',
      durationMs: 23 * SEC,
    })
    // The agenda vote and the next strategy phase follow the new speaker.
    expect(view.speakerId).toBe('tom')
    expect(view.voteOrder).toEqual([
      'priya',
      'sam',
      'wren',
      'jaz',
      'kira',
      'tom',
    ])
    expect(view.pickOrder[0]).toBe('tom')
  })

  it('changes the choice with a second tap', () => {
    const t = playPolitics()
    t.act({ kind: 'speakerMoved', playerId: 'tom' })
    t.act({ kind: 'speakerMoved', playerId: 'priya' })
    expect(reaction(t)?.speakerChoice).toEqual({
      fromId: 'jaz',
      options: OTHERS,
      chosenId: 'priya',
    })
  })

  it('undoes the choice and returns every clock to the choice', () => {
    const t = playPolitics()
    t.wait(5 * SEC)
    t.act({ kind: 'speakerMoved', playerId: 'tom' })
    t.wait(5 * SEC)
    t.undo() // the 5 seconds since the choice are charged to nobody
    t.wait(5 * SEC)
    expect(t.view().speakerId).toBe('jaz')
    expect(t.view().timer).toMatchObject({
      kind: 'reaction',
      elapsedMs: 10 * SEC,
    })
    expect(reaction(t)).toMatchObject({
      pausedTurnMs: 20 * SEC,
      speakerChoice: { chosenId: null },
    })
  })

  it('closes without a choice and keeps the speaker', () => {
    const t = playPolitics()
    OTHERS.forEach((id) => t.act({ kind: 'reactionDone', playerId: id }))
    expect(reaction(t)).toBeNull()
    expect(t.view().speakerId).toBe('jaz')
  })

  it('offers no speaker choice for other cards', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'strategyCardPlayed' }) // Tom plays Leadership
    expect(reaction(t)).toMatchObject({ card: 1, speakerChoice: null })
  })
})
