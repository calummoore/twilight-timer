import { describe, expect, it } from 'vitest'
import { initiativeOrder, pickOrder, rotate, voteOrder } from './orders'

const SEATS = ['jaz', 'kira', 'tom', 'priya', 'sam', 'wren']
const PICKS = new Map([
  ['jaz', 3],
  ['kira', 8],
  ['tom', 1],
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

  it('orders the action phase by strategy card number', () => {
    expect(initiativeOrder(PICKS, null)).toEqual([
      { playerId: 'tom', initiative: 1 },
      { playerId: 'jaz', initiative: 3 },
      { playerId: 'kira', initiative: 8 },
    ])
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
