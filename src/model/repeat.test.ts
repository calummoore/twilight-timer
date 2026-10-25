import { describe, expect, it } from 'vitest'
import type { Settings } from './settings'
import {
  LIMITS_ON,
  MIN,
  PICKS,
  SEC,
  passAll,
  playStrategy,
  table,
  type Table,
} from './test-table'
import type { Intent } from './types'

/** Every player picks, but the action phase has not started. */
function pickAll(t: Table): void {
  for (const id of t.view().pickOrder) {
    t.act({ kind: 'cardPicked', playerId: id, card: PICKS[id] ?? 0 })
  }
}

function toStatus(t: Table): void {
  playStrategy(t)
  passAll(t)
}

function toAgenda(t: Table): void {
  toStatus(t)
  t.act({ kind: 'custodiansSet', removed: true })
  t.act({ kind: 'phaseStepped' })
}

function toSummary(t: Table): void {
  toStatus(t)
  t.act({ kind: 'phaseStepped' })
}

function inWindow(t: Table): void {
  playStrategy(t)
  t.act({ kind: 'strategyCardPlayed' })
}

interface Case {
  name: string
  setup: (t: Table) => void
  intent: Intent
  settings?: Settings
}

const CASES: Case[] = [
  {
    name: 'a strategy pick',
    setup: () => undefined,
    intent: { kind: 'cardPicked', playerId: 'jaz', card: 3 },
  },
  {
    name: 'the step to the action phase',
    setup: pickAll,
    intent: { kind: 'phaseStepped' },
  },
  { name: 'End Turn', setup: playStrategy, intent: { kind: 'turnEnded' } },
  { name: 'Pass', setup: playStrategy, intent: { kind: 'passed' } },
  {
    name: 'End Turn of the last player who has not passed',
    setup: (t) => {
      playStrategy(t)
      for (let i = 0; i < 5; i++) t.act({ kind: 'passed' })
    },
    intent: { kind: 'turnEnded' },
  },
  {
    name: 'a strategic action',
    setup: playStrategy,
    intent: { kind: 'strategyCardPlayed' },
  },
  {
    name: 'a reaction mark',
    setup: inWindow,
    intent: { kind: 'reactionDone', playerId: 'jaz' },
  },
  {
    name: 'a reaction window extension',
    setup: inWindow,
    intent: { kind: 'reactionExtended', ms: MIN },
    settings: LIMITS_ON,
  },
  {
    name: 'closing the reaction window',
    setup: inWindow,
    intent: { kind: 'reactionClosed' },
  },
  {
    name: 'a status step',
    setup: toStatus,
    intent: { kind: 'statusStepSet', step: 2, done: true },
  },
  {
    name: 'the step out of the status phase',
    setup: toStatus,
    intent: { kind: 'phaseStepped' },
  },
  {
    name: 'removing the Custodians token',
    setup: toStatus,
    intent: { kind: 'custodiansSet', removed: true },
  },
  {
    name: 'opening the vote',
    setup: toAgenda,
    intent: { kind: 'votingOpened' },
  },
  {
    name: 'a vote',
    setup: (t) => {
      toAgenda(t)
      t.act({ kind: 'votingOpened' })
    },
    intent: { kind: 'voteCast' },
  },
  {
    name: 'resolving an agenda',
    setup: toAgenda,
    intent: { kind: 'agendaResolved' },
  },
  {
    name: 'the step to the next round',
    setup: toSummary,
    intent: { kind: 'phaseStepped' },
  },
  {
    name: 'moving the speaker',
    setup: () => undefined,
    intent: { kind: 'speakerMoved', playerId: 'kira' },
  },
  {
    name: 'ending the game',
    setup: playStrategy,
    intent: { kind: 'gameEnded' },
  },
]

describe('a tap that two devices send', () => {
  it.each(CASES)('applies $name once', ({ setup, intent, settings }) => {
    const t = table(settings)
    setup(t)
    const input = t.aim(intent)
    if (!input) throw new Error('the view has nothing to aim at')
    t.wait(5 * SEC)
    expect(t.send(input)).toBe(true)
    const after = t.game
    t.wait(SEC)
    expect(t.send(input)).toBe(false)
    expect(t.game).toBe(after)
  })
})

describe('tap ids and stale taps', () => {
  it('applies a tap id once, also with another action', () => {
    const t = table()
    expect(t.send({ kind: 'speakerMoved', playerId: 'kira' }, 'x')).toBe(true)
    expect(t.send({ kind: 'speakerMoved', playerId: 'tom' }, 'x')).toBe(false)
    expect(t.view().speakerId).toBe('kira')
  })

  it('drops a reaction mark that names an earlier window', () => {
    const t = table()
    inWindow(t)
    const late = t.aim({ kind: 'reactionDone', playerId: 'jaz' })
    if (!late) throw new Error('no window')
    t.act({ kind: 'reactionClosed' })
    t.act({ kind: 'turnEnded' })
    t.act({ kind: 'strategyCardPlayed' }) // Wren's window
    expect(t.send(late)).toBe(false)
    expect(t.act({ kind: 'reactionDone', playerId: 'jaz' })).toBe(true)
  })

  it('undoes only the action that the undo names', () => {
    const t = table()
    playStrategy(t)
    t.wait(20 * SEC)
    t.act({ kind: 'turnEnded' })
    const first = t.game.actions.at(-1)?.id ?? ''
    t.wait(20 * SEC)
    t.act({ kind: 'turnEnded' }) // another device ends the next turn first
    const second = t.game.actions.at(-1)?.id ?? ''
    t.undoTap(first)
    expect(t.view().view).toMatchObject({ activeId: 'jaz' })
    t.undoTap(second)
    expect(t.view().view).toMatchObject({ activeId: 'wren' })
    t.undoTap(second) // a second device presses Undo for the same action
    expect(t.view().view).toMatchObject({ activeId: 'wren' })
  })
})
