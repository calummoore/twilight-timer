import { describe, expect, it } from 'vitest'
import { entryClock, mergeIntervals } from './time'

describe('entry time', () => {
  it('merges overlapping ranges and closes open ones', () => {
    const merged = mergeIntervals(
      [
        { from: 50, to: 60 },
        { from: 10, to: 20 },
        { from: 15, to: 30 },
        { from: 80, to: null },
      ],
      100,
    )
    expect(merged).toEqual([
      [10, 30],
      [50, 60],
      [80, 100],
    ])
  })

  it('counts time since the start without the excluded ranges', () => {
    const toMs = entryClock(1000, [
      [500, 1500],
      [2000, 2500],
    ])
    expect(toMs(1000)).toBe(0)
    expect(toMs(1600)).toBe(100)
    expect(toMs(2200)).toBe(500)
    expect(toMs(3000)).toBe(1000)
  })
})
