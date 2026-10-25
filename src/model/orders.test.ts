import { describe, expect, it } from 'vitest'
import { initiativeOrder, leftOf, pickOrder, rotate, voteOrder } from './orders'

const SEATS = ['jaz', 'kira', 'tom', 'priya', 'sam', 'wren']
const PICKS = new Map([
  ['jaz', [3]],
  ['kira', [8]],
  ['tom', [1]],
])

describe('orders', () => {
  it('starts strategy picks with the speaker and goes clockwise', () => {
    expect(pickOrder(SEATS, 'tom')).toEqual([
      'tom',
      'priya',
      'sam',
      'wren',
      'jaz',
      'kira',
    ])
  })

  it('starts votes left of the speaker and ends with the speaker', () => {
    expect(voteOrder(SEATS, 'jaz')).toEqual([
      'kira',
      'tom',
      'priya',
      'sam',
      'wren',
      'jaz',
    ])
    expect(voteOrder(SEATS, 'wren')).toEqual(SEATS)
  })

  it('finds the player on the left, around the table', () => {
    expect(leftOf(SEATS, 'jaz')).toBe('kira')
    expect(leftOf(SEATS, 'wren')).toBe('jaz')
    expect(leftOf(SEATS, 'zed')).toBeUndefined()
  })

  it('orders the action phase by strategy card number', () => {
    expect(initiativeOrder(PICKS, null)).toEqual([
      { playerId: 'tom', initiative: 1 },
      { playerId: 'jaz', initiative: 3 },
      { playerId: 'kira', initiative: 8 },
    ])
  })

  it('gives a player with two cards one place, at the lower card', () => {
    const picks = new Map([
      ['jaz', [8, 3]],
      ['kira', [5, 6]],
      ['tom', [1, 7]],
      ['priya', [2, 4]],
    ])
    expect(initiativeOrder(picks, null)).toEqual([
      { playerId: 'tom', initiative: 1 },
      { playerId: 'priya', initiative: 2 },
      { playerId: 'jaz', initiative: 3 },
      { playerId: 'kira', initiative: 5 },
    ])
    expect(initiativeOrder(picks, 'kira')[0]).toEqual({
      playerId: 'kira',
      initiative: 0,
    })
  })

  it('puts the Naalu token holder first with initiative 0', () => {
    expect(initiativeOrder(PICKS, 'kira')).toEqual([
      { playerId: 'kira', initiative: 0 },
      { playerId: 'tom', initiative: 1 },
      { playerId: 'jaz', initiative: 3 },
    ])
    // A holder who has not picked a card yet is not in the order.
    const order = initiativeOrder(PICKS, 'sam').map((slot) => slot.playerId)
    expect(order).toEqual(['tom', 'jaz', 'kira'])
  })

  it('rotates by any offset', () => {
    expect(rotate([1, 2, 3], -1)).toEqual([3, 1, 2])
    expect(rotate([1, 2, 3], 4)).toEqual([2, 3, 1])
    expect(rotate([], 2)).toEqual([])
  })
})
