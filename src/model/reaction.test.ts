import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { LIMITS_ON, MIN, SEC, playStrategy, table } from './test-table'

const OTHERS = ['wren', 'jaz', 'sam', 'kira', 'priya']

function openWindow(settings = LIMITS_ON) {
  const t = table(settings)
  playStrategy(t)
  t.wait(10 * SEC) // Tom's turn
  t.act({ kind: 'strategyCardPlayed' })
  return t
}

describe('reaction window', () => {
  it('stops the active clock and charges the window to nobody', () => {
    const t = openWindow()
    t.wait(5 * SEC)
    t.act({ kind: 'reactionDone', playerId: 'jaz' })
    const view = t.view()
    expect(view.timer).toMatchObject({
      kind: 'reaction',
      playerId: null,
      elapsedMs: 5 * SEC,
    })
    expect(view.view).toMatchObject({
      phase: 'action',
      activeId: 'tom',
      cardPlayed: true,
      reaction: {
        card: 1,
        byId: 'tom',
        turnMs: 10 * SEC,
        endsTurn: true,
        doneCount: 1,
      },
    })
  })

  it('marks every waiting player done at once', () => {
    const t = openWindow()
    t.wait(5 * SEC)
    t.act({ kind: 'reactionDone', playerId: 'jaz' })
    t.wait(25 * SEC)
    t.act({ kind: 'reactionClosed' }) // Mark all done
    const window = t.view().entries.find((e) => e.kind === 'reaction')
    const took = Object.fromEntries(
      window?.reactions?.map((r) => [r.playerId, r.tookMs / SEC]) ?? [],
    )
    // Jaz keeps their own time. The others get the whole window.
    expect(took).toEqual({ jaz: 5, kira: 30, priya: 30, sam: 30, wren: 30 })
    expect(window).toMatchObject({ durationMs: 30 * SEC, running: false })
  })

  it('closes when every other player is done', () => {
    const t = openWindow()
    OTHERS.forEach((id) => {
      t.wait(6 * SEC)
      t.act({ kind: 'reactionDone', playerId: id })
    })
    expect(t.view().view).toMatchObject({ reaction: null })
    const window = t.view().entries.find((e) => e.kind === 'reaction')
    expect(window).toMatchObject({
      playerId: null,
      durationMs: 30 * SEC,
      card: 1,
      running: false,
    })
    // Tiles follow seat order. Wren marked first, Priya last.
    const took = Object.fromEntries(
      window?.reactions?.map((r) => [r.playerId, r.tookMs / SEC]) ?? [],
    )
    expect(took).toEqual({ wren: 6, jaz: 12, sam: 18, kira: 24, priya: 30 })
  })

  it('gives passed players a tile and closes by hand', () => {
    const t = table()
    playStrategy(t)
    t.act({ kind: 'passed' }) // Tom passes
    t.act({ kind: 'strategyCardPlayed' }) // Wren plays Diplomacy
    const view = t.view().view
    const tiles = view.phase === 'action' ? view.reaction?.tiles : []
    expect(tiles?.find((tile) => tile.playerId === 'tom')).toMatchObject({
      passed: true,
    })
    t.wait(40 * SEC)
    t.act({ kind: 'reactionClosed' })
    const window = t.view().entries.find((e) => e.kind === 'reaction')
    expect(
      window?.reactions?.every((r) => !r.marked && r.tookMs === 40 * SEC),
    ).toBe(true)
  })

  it('stays open past its limit and counts overtime from the extension', () => {
    const t = openWindow() // the window limit is 2:00
    t.wait(MIN)
    expect(t.act({ kind: 'reactionExtended', ms: MIN })).toBe(true)
    t.wait(150 * SEC) // 30 seconds past the extended 3:00
    expect(t.view().timer).toMatchObject({
      kind: 'reaction',
      elapsedMs: 210 * SEC,
      limitMs: 3 * MIN,
    })
    expect(t.act({ kind: 'reactionDone', playerId: 'jaz' })).toBe(true)
    t.act({ kind: 'reactionClosed' })
    const window = t.view().entries.find((e) => e.kind === 'reaction')
    expect(window).toMatchObject({
      durationMs: 210 * SEC,
      limitMs: 3 * MIN,
      overtimeMs: 30 * SEC,
    })
  })

  it('stays open without a limit and cannot be extended', () => {
    const t = openWindow(DEFAULT_SETTINGS)
    t.wait(10 * MIN)
    expect(t.view().timer).toMatchObject({ kind: 'reaction', limitMs: null })
    expect(t.act({ kind: 'reactionExtended', ms: MIN })).toBe(false)
  })

  it('allows one strategic action per player per round', () => {
    const t = openWindow()
    t.act({ kind: 'reactionClosed' }) // Tom's turn ends
    for (let i = 0; i < 5; i++) t.act({ kind: 'passed' }) // all but Tom
    expect(t.view().view).toMatchObject({ activeId: 'tom', cardPlayed: true })
    expect(t.act({ kind: 'strategyCardPlayed' })).toBe(false)
  })
})
