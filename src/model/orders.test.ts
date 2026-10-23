import { describe, expect, it } from 'vitest'
import { initiativeOrder, pickOrder, rotate, voteOrder } from './orders'

const SEATS = ['jaz', 'kira', 'tom', 'priya', 'sam', 'wren']

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
    const picks = new Map([
      ['jaz', 3],
      ['kira', 8],
      ['tom', 1],
    ])
    expect(initiativeOrder(picks)).toEqual(['tom', 'jaz', 'kira'])
  })

  it('rotates by any offset', () => {
    expect(rotate([1, 2, 3], -1)).toEqual([3, 1, 2])
    expect(rotate([1, 2, 3], 4)).toEqual([2, 3, 1])
    expect(rotate([], 2)).toEqual([])
  })
})
