import { describe, expect, it } from 'vitest'
import type { Device } from './devices'
import type { Command } from './protocol'
import { mayAct, mayCommand } from './rights'
import { DEFAULT_LIMITS } from './settings'
import { PICKS, playStrategy, table } from './test-table'
import type { ActionInput } from './types'

const HOST: Device = { id: 'd1', seat: null, admin: true }
const VIEWER: Device = { id: 'd5', seat: null, admin: false }
const phone = (seat: string, admin = false): Device => ({
  id: `d-${seat}`,
  seat,
  admin,
})

/** Tom has initiative 1, so the action phase starts with Tom's turn. */
function actionTable() {
  const t = table()
  playStrategy(t)
  return t
}

describe('rights of a seated device', () => {
  it('picks a strategy card only for its own player, on their pick', () => {
    const view = table().view() // Jaz picks first
    const pick = (playerId: string): ActionInput => ({
      kind: 'cardPicked',
      playerId,
      card: PICKS[playerId] ?? 0,
    })
    expect(mayAct(phone('jaz'), pick('jaz'), view)).toBe(true)
    expect(mayAct(phone('jaz'), pick('kira'), view)).toBe(false)
    expect(mayAct(phone('kira'), pick('kira'), view)).toBe(false)
    expect(mayAct(HOST, pick('kira'), view)).toBe(true)
  })

  it('ends the turn, plays a card, or passes only on its own turn', () => {
    const view = actionTable().view()
    const taps: ActionInput[] = [
      { kind: 'turnEnded' },
      { kind: 'passed' },
      { kind: 'strategyCardPlayed', card: 1 },
    ]
    for (const tap of taps) {
      expect(mayAct(phone('tom'), tap, view)).toBe(true)
      expect(mayAct(phone('jaz'), tap, view)).toBe(false)
      expect(mayAct(HOST, tap, view)).toBe(true)
    }
  })

  it('marks done only on its own tile, and the card player closes the window', () => {
    const t = actionTable()
    t.act({ kind: 'strategyCardPlayed', card: 1 })
    const view = t.view()
    const done = (playerId: string): ActionInput => ({
      kind: 'reactionDone',
      playerId,
    })
    expect(mayAct(phone('jaz'), done('jaz'), view)).toBe(true)
    expect(mayAct(phone('jaz'), done('kira'), view)).toBe(false)
    expect(mayAct(HOST, done('kira'), view)).toBe(true)
    for (const tap of [
      { kind: 'reactionClosed' },
      { kind: 'reactionExtended', ms: 60_000 },
    ] as const) {
      expect(mayAct(phone('tom'), tap, view)).toBe(true)
      expect(mayAct(phone('jaz'), tap, view)).toBe(false)
    }
    // The turn is held while the window is open.
    expect(mayAct(phone('tom'), { kind: 'turnEnded' }, view)).toBe(false)
  })

  it('chooses the new speaker only after playing Politics', () => {
    const t = actionTable()
    t.act({ kind: 'turnEnded' }) // Tom
    t.act({ kind: 'turnEnded' }) // Wren
    t.act({ kind: 'strategyCardPlayed', card: 3 }) // Jaz plays Politics
    const view = t.view()
    const to = (playerId: string): ActionInput => ({
      kind: 'speakerMoved',
      playerId,
    })
    expect(mayAct(phone('jaz'), to('kira'), view)).toBe(true)
    // Jaz holds the token, so Jaz is not a choice.
    expect(mayAct(phone('jaz'), to('jaz'), view)).toBe(false)
    expect(mayAct(phone('kira'), to('kira'), view)).toBe(false)
    expect(mayAct(phone('jaz'), to('kira'), actionTable().view())).toBe(false)
    expect(mayAct(HOST, to('kira'), actionTable().view())).toBe(true)
  })

  it('casts a vote only on its own vote', () => {
    const t = actionTable()
    for (let i = 0; i < 6; i++) t.act({ kind: 'passed' })
    t.act({ kind: 'custodiansSet', removed: true })
    t.act({ kind: 'phaseStepped' })
    t.act({ kind: 'votingOpened' })
    const view = t.view() // Kira, on the speaker's left, votes first
    expect(mayAct(phone('kira'), { kind: 'voteCast' }, view)).toBe(true)
    expect(mayAct(phone('jaz'), { kind: 'voteCast' }, view)).toBe(false)
    expect(mayAct(HOST, { kind: 'voteCast' }, view)).toBe(true)
  })

  it('leaves the shared taps to admin devices', () => {
    const view = actionTable().view()
    const shared: ActionInput[] = [
      { kind: 'phaseStepped' },
      { kind: 'statusStepToggled', step: 0 },
      { kind: 'custodiansSet', removed: true },
      { kind: 'votingOpened' },
      { kind: 'agendaResolved' },
      { kind: 'speakerMoved', playerId: 'kira' },
      { kind: 'naaluTokenMoved', playerId: 'kira' },
      { kind: 'playerRemoved', playerId: 'kira' },
      { kind: 'gameEnded' },
    ]
    for (const tap of shared) {
      // Tom's own turn does not give Tom the shared taps.
      expect(mayAct(phone('tom'), tap, view)).toBe(false)
      expect(mayAct(phone('tom', true), tap, view)).toBe(true)
      expect(mayAct(HOST, tap, view)).toBe(true)
    }
  })
})

describe('rights of an admin device', () => {
  it('moves a seat, which a seated device and a viewer may not', () => {
    const view = actionTable().view()
    const move: ActionInput = {
      kind: 'seatMoved',
      playerId: 'tom',
      toId: 'kira',
    }
    expect(mayAct(HOST, move, view)).toBe(true)
    expect(mayAct(phone('tom', true), move, view)).toBe(true)
    // Tom's own turn does not give Tom the move.
    expect(mayAct(phone('tom'), move, view)).toBe(false)
    expect(mayAct(VIEWER, move, view)).toBe(false)
    expect(mayAct(undefined, move, view)).toBe(false)
  })
})

describe('rights of every device', () => {
  const view = actionTable().view()
  const adminOnly: Command[] = [
    { type: 'admin', deviceId: 'd2', admin: true },
    { type: 'start' },
    { type: 'undo' },
    { type: 'pause' },
    { type: 'resume' },
    { type: 'pauseReason', reason: 'ruleCheck' },
    { type: 'limits', enforceLimits: true, limits: DEFAULT_LIMITS },
  ]

  it('lets only an admin device send the table commands', () => {
    for (const command of adminOnly) {
      expect(mayCommand(HOST, command, view)).toBe(true)
      expect(mayCommand(phone('tom'), command, view)).toBe(false)
      expect(mayCommand(VIEWER, command, view)).toBe(false)
      expect(mayCommand(undefined, command, view)).toBe(false)
    }
  })

  it('lets every device take a seat or join as a table device', () => {
    for (const seat of ['jaz', null]) {
      const claim: Command = { type: 'claim', seat }
      for (const device of [HOST, phone('tom'), VIEWER, undefined]) {
        expect(mayCommand(device, claim, view)).toBe(true)
      }
    }
  })

  it('gives a viewer and a device that has not joined no taps', () => {
    const tap: Command = { type: 'act', input: { kind: 'turnEnded' } }
    expect(mayCommand(VIEWER, tap, view)).toBe(false)
    expect(mayCommand(undefined, tap, view)).toBe(false)
  })

  it('gives a seated device no taps in the lobby', () => {
    const tap: Command = { type: 'act', input: { kind: 'turnEnded' } }
    expect(mayCommand(phone('tom'), tap, null)).toBe(false)
    expect(mayCommand(HOST, tap, null)).toBe(true)
  })
})

describe('admin recovery', () => {
  const take = (deviceId: string, admin = true): Command => ({
    type: 'admin',
    deviceId,
    admin,
  })

  it('lets a seated device take admin while every admin device is away', () => {
    const jaz = phone('jaz')
    expect(mayCommand(jaz, take(jaz.id), null, true)).toBe(true)
    expect(mayCommand(jaz, take(jaz.id), actionTable().view(), true)).toBe(true)
  })

  it('keeps admin with the admin devices while one is connected', () => {
    const jaz = phone('jaz')
    expect(mayCommand(jaz, take(jaz.id), null, false)).toBe(false)
    expect(mayCommand(jaz, take(jaz.id), null)).toBe(false)
  })

  it('gives a device its own admin only, and only to switch it on', () => {
    const jaz = phone('jaz')
    expect(mayCommand(jaz, take('d-kira'), null, true)).toBe(false)
    expect(mayCommand(jaz, take(jaz.id, false), null, true)).toBe(false)
  })

  it('gives a viewer no admin, also while every admin device is away', () => {
    expect(mayCommand(VIEWER, take(VIEWER.id), null, true)).toBe(false)
  })
})
