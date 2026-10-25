import { describe, expect, it } from 'vitest'
import { joinPath, makeCode, parseLink, readCode, tablePath } from './codes'
import { limitsNow, setEnforce, setLimit } from './commands'
import { derive } from './derive'
import { playerView } from './player-view'
import { DEFAULT_LIMITS } from './settings'
import { MIN, SEC, playStrategy, table } from './test-table'
import { nowFor, toServerTime } from './time-base'

describe('join codes and links', () => {
  it('makes six characters from the alphabet without look-alikes', () => {
    const values = [0, 0.999999, 0.5, 0.25, 0.75, 0.1]
    expect(makeCode(() => values.shift() ?? 0)).toBe('2ZH9S5')
  })

  it('reads typed codes and refuses look-alikes and wrong lengths', () => {
    expect(readCode(' ab-c 234 ')).toBe('ABC234')
    expect(readCode('ABC23O')).toBeNull()
    expect(readCode('ABC23')).toBeNull()
  })

  it('reads the join route and the table route with its secret', () => {
    const secret = 'a'.repeat(32)
    expect(parseLink(joinPath('ABC234'), '')).toEqual({
      kind: 'join',
      code: 'ABC234',
    })
    expect(parseLink('/join', '')).toEqual({ kind: 'join', code: null })
    const [path, hash] = tablePath('ABC234', secret).split('#')
    expect(parseLink(path ?? '', `#${hash}`)).toEqual({
      kind: 'table',
      code: 'ABC234',
      secret,
    })
    expect(parseLink('/table/ABC234', '#short')).toBeNull()
    expect(parseLink('/', '')).toBeNull()
  })
})

describe('the time base', () => {
  it('moves a game to the server clock with no jump in any clock', () => {
    const t = table()
    playStrategy(t)
    t.wait(90 * SEC)
    t.pause()
    t.wait(MIN)
    t.resume()
    const shifted = toServerTime(t.game, 7000)
    const before = derive(t.game, t.now)
    const after = derive(shifted, nowFor(shifted, t.now, 7000))
    expect(after.timer).toEqual(before.timer)
    expect(after.gameMs).toBe(before.gameMs)
    expect(after.entries).toEqual(before.entries)
    expect(shifted.timeBase).toBe('server')
    expect(nowFor(t.game, 100, 7000)).toBe(100)
  })
})

describe('limits for one timer', () => {
  it('changes one timer and keeps the others and the master switch', () => {
    const t = table()
    const game = setLimit(t.game, 'vote', { on: true, ms: 90 * SEC }, t.now)
    expect(limitsNow(game)).toEqual({
      enforce: false,
      limits: { ...DEFAULT_LIMITS, vote: { on: true, ms: 90 * SEC } },
    })
    expect(limitsNow(setEnforce(game, true, t.now)).enforce).toBe(true)
  })
})

describe('player views', () => {
  it('counts the turns before a player and lists who passed', () => {
    const t = table()
    playStrategy(t) // initiative: Tom, Wren, Jaz, Sam, Kira, Priya
    t.act({ kind: 'turnEnded' }) // Wren acts
    t.act({ kind: 'passed' }) // Wren passes, Jaz acts
    const kira = playerView(t.view(), 'kira')
    expect(kira).toMatchObject({
      actorId: 'jaz',
      turnsAway: 2,
      before: ['jaz', 'sam'],
      passedOthers: ['wren'],
      myTurn: false,
    })
    expect(playerView(t.view(), 'wren')).toMatchObject({
      passed: true,
      turnsAway: null,
    })
    expect(playerView(t.view(), 'jaz')).toMatchObject({
      myTurn: true,
      turnsAway: 0,
    })
  })

  it('shows the reaction tile of the player and their rank', () => {
    const t = table()
    playStrategy(t)
    t.wait(30 * SEC)
    t.act({ kind: 'strategyCardPlayed' })
    t.act({ kind: 'reactionDone', playerId: 'kira' })
    expect(playerView(t.view(), 'kira')?.reaction).toMatchObject({
      mine: 'done',
      byId: 'tom',
      doneCount: 1,
      tiles: 5,
    })
    expect(playerView(t.view(), 'jaz')?.reaction?.mine).toBe('open')
    expect(playerView(t.view(), 'tom')?.reaction?.mine).toBeNull()
    expect(playerView(t.view(), 'tom')?.stats).toMatchObject({
      rank: 1,
      turns: 1,
    })
  })
})
