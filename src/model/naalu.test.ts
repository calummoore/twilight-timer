import { describe, expect, it } from 'vitest'
import { startGame } from './commands'
import { DEFAULT_SETTINGS } from './settings'
import {
  NAALU_PLAYERS,
  PICKS,
  PLAYERS,
  SEC,
  T0,
  passAll,
  playStrategy,
  table,
  type Table,
} from './test-table'

/** Sam is the Naalu. Initiative: Sam 0, Tom 1, Wren 2, Jaz 3, Kira 5, Priya 7. */
function naaluTable() {
  return table(DEFAULT_SETTINGS, 'jaz', NAALU_PLAYERS)
}

function activeId(t: Table): string | null {
  const view = t.view().view
  return view.phase === 'action' ? view.activeId : null
}

/** Ends the status phase and the round summary, so the next round starts. */
function nextRound(t: Table): void {
  passAll(t)
  t.act({ kind: 'phaseStepped' }) // status to summary
  t.act({ kind: 'phaseStepped' }) // summary to the next strategy phase
}

describe('the Naalu "0" token', () => {
  it('belongs to the player with the Naalu faction', () => {
    const naalu = startGame(NAALU_PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    expect(naalu.naaluTokenOwnerId).toBe('sam')
    const plain = startGame(PLAYERS, 'jaz', DEFAULT_SETTINGS, T0)
    expect(plain.naaluTokenOwnerId).toBeNull()
  })

  it('gives the holder the first turn, then follows card order', () => {
    const t = naaluTable()
    playStrategy(t)
    const turns: (string | null)[] = []
    for (let i = 0; i < 7; i++) {
      turns.push(activeId(t))
      t.act({ kind: 'turnEnded' })
    }
    expect(turns).toEqual(['sam', 'tom', 'wren', 'jaz', 'kira', 'priya', 'sam'])
  })

  it('skips a holder who has passed', () => {
    const t = naaluTable()
    playStrategy(t)
    t.act({ kind: 'passed' }) // Sam
    for (let i = 0; i < 5; i++) t.act({ kind: 'turnEnded' }) // Tom to Priya
    expect(activeId(t)).toBe('tom')
  })

  it('charges each turn to the player whose turn it is', () => {
    const t = naaluTable()
    playStrategy(t)
    t.wait(30 * SEC)
    t.act({ kind: 'turnEnded' })
    t.wait(20 * SEC)
    t.act({ kind: 'turnEnded' })
    const turns = t.view().entries.filter((e) => e.kind === 'turn')
    expect(turns).toMatchObject([
      { playerId: 'sam', durationMs: 30 * SEC, running: false },
      { playerId: 'tom', durationMs: 20 * SEC, running: false },
      { playerId: 'wren', durationMs: 0, running: true },
    ])
  })

  it('shows initiative 0 for the holder and keeps the card', () => {
    const t = naaluTable()
    playStrategy(t)
    expect(t.view().view).toMatchObject({
      phase: 'action',
      activeId: 'sam',
      activeInitiative: 0,
      activeCard: 4,
      rail: [
        { playerId: 'sam', initiative: 0, card: 4 },
        { playerId: 'tom', initiative: 1, card: 1 },
        { playerId: 'wren', initiative: 2, card: 2 },
        { playerId: 'jaz', initiative: 3, card: 3 },
        { playerId: 'kira', initiative: 5, card: 5 },
        { playerId: 'priya', initiative: 7, card: 7 },
      ],
    })
  })

  it('lists the holder first with 0 in the order so far', () => {
    const t = naaluTable()
    for (const id of ['jaz', 'kira', 'tom', 'priya', 'sam']) {
      t.act({ kind: 'cardPicked', playerId: id, card: PICKS[id] ?? 0 })
    }
    expect(t.view().view).toMatchObject({
      phase: 'strategy',
      naaluTokenOwnerId: 'sam',
      naaluTokenHolderId: 'sam',
      order: [
        { playerId: 'sam', initiative: 0 },
        { playerId: 'tom', initiative: 1 },
        { playerId: 'jaz', initiative: 3 },
        { playerId: 'kira', initiative: 5 },
        { playerId: 'priya', initiative: 7 },
      ],
    })
  })

  it('moves to another player for one round with Gift of Prescience', () => {
    const t = naaluTable()
    expect(t.act({ kind: 'naaluTokenMoved', playerId: 'kira' })).toBe(true)
    expect(t.act({ kind: 'naaluTokenMoved', playerId: 'priya' })).toBe(true)
    playStrategy(t)
    expect(t.view().view).toMatchObject({
      activeId: 'priya',
      rail: [
        { playerId: 'priya', initiative: 0, card: 7 },
        { playerId: 'tom', initiative: 1 },
        { playerId: 'wren', initiative: 2 },
        { playerId: 'jaz', initiative: 3 },
        { playerId: 'sam', initiative: 4, card: 4 },
        { playerId: 'kira', initiative: 5 },
      ],
    })
    nextRound(t)
    expect(t.view().view).toMatchObject({
      phase: 'strategy',
      naaluTokenHolderId: 'sam',
    })
  })

  it('rejects a move to the holder, to an unknown player, or later', () => {
    const t = naaluTable()
    expect(t.act({ kind: 'naaluTokenMoved', playerId: 'sam' })).toBe(false)
    expect(t.act({ kind: 'naaluTokenMoved', playerId: 'zed' })).toBe(false)
    playStrategy(t)
    expect(t.act({ kind: 'naaluTokenMoved', playerId: 'tom' })).toBe(false)
  })

  it('rejects a move in a game without a Naalu player', () => {
    const t = table()
    expect(t.act({ kind: 'naaluTokenMoved', playerId: 'tom' })).toBe(false)
    playStrategy(t)
    expect(activeId(t)).toBe('tom')
  })

  it('undoes a move without voiding time', () => {
    const t = naaluTable()
    t.wait(5 * SEC)
    t.act({ kind: 'naaluTokenMoved', playerId: 'kira' })
    t.wait(3 * SEC)
    t.undo()
    const view = t.view()
    expect(view.view).toMatchObject({ naaluTokenHolderId: 'sam' })
    expect(view.timer).toMatchObject({ playerId: 'jaz', elapsedMs: 8 * SEC })
    expect(t.game.voids).toEqual([])
  })
})
