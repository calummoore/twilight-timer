import { describe, expect, it } from 'vitest'
import { dealFactions, factionChoices, factionsInPlay } from './deal'
import { FACTIONS, type FactionId } from './factions'
import { DEFAULT_EXPANSIONS, type Expansions } from './settings'

const ALL_ON = DEFAULT_EXPANSIONS
const ALL_OFF: Expansions = { pok: false, te: false, keleres: false }
const BASE: FactionId[] = [
  'arborec',
  'letnev',
  'saar',
  'muaat',
  'hacan',
  'sol',
  'creuss',
  'l1z1x',
  'mentak',
  'naalu',
  'nekro',
  'sardakk',
  'jolnar',
  'winnu',
  'xxcha',
  'yin',
  'yssaril',
]
const POK: FactionId[] = [
  'argent',
  'empyrean',
  'mahact',
  'naazrokha',
  'nomad',
  'titans',
  'cabal',
]
const TE: FactionId[] = [
  'crimson',
  'deepwrought',
  'firmament',
  'bastion',
  'ralnel',
]

/** A random source that returns the numbers in turn, then the last again. */
function sequence(...values: number[]): () => number {
  let next = 0
  return () => values[Math.min(next++, values.length - 1)] ?? 0
}

/** The factions in name order, as the faction list holds them. */
const inNameOrder = (ids: FactionId[]) =>
  FACTIONS.map((f) => f.id).filter((id) => ids.includes(id))

describe('factions in play', () => {
  it('holds all 30 factions in name order with every expansion on', () => {
    expect(factionsInPlay(ALL_ON)).toEqual(FACTIONS.map((f) => f.id))
    expect(factionsInPlay(ALL_ON)).toHaveLength(30)
  })

  it('holds the 17 factions of the base game with every expansion off', () => {
    expect(factionsInPlay(ALL_OFF)).toEqual(inNameOrder(BASE))
    expect(BASE).toHaveLength(17)
  })

  it('adds only the factions of each expansion that is on', () => {
    const only = (on: Partial<Expansions>) =>
      factionsInPlay({ ...ALL_OFF, ...on })
    expect(only({ pok: true })).toEqual(inNameOrder([...BASE, ...POK]))
    expect(only({ te: true })).toEqual(inNameOrder([...BASE, ...TE]))
    expect(only({ keleres: true })).toEqual(inNameOrder([...BASE, 'keleres']))
  })
})

describe('the choices of a seat', () => {
  it('add the faction that the seat holds when its expansion is off', () => {
    const choices = factionChoices(ALL_OFF, 'bastion')
    expect(choices).toEqual(inNameOrder([...BASE, 'bastion']))
    expect(choices.indexOf('bastion')).toBe(choices.indexOf('l1z1x') + 1)
  })

  it('add nothing for an empty seat or a faction in play', () => {
    expect(factionChoices(ALL_OFF, null)).toEqual(factionsInPlay(ALL_OFF))
    expect(factionChoices(ALL_OFF, 'sol')).toEqual(factionsInPlay(ALL_OFF))
    expect(factionChoices(ALL_ON, 'bastion')).toEqual(factionsInPlay(ALL_ON))
  })
})

describe('the deal', () => {
  it('fills only the empty seats and keeps every held faction', () => {
    const rows = [null, 'naalu', null, null, 'sol', null, null, null] as const
    const dealt = dealFactions(rows, 6, ALL_ON, sequence(0.7, 0.2, 0.9, 0.4))
    expect(dealt).toHaveLength(8)
    expect(dealt[1]).toBe('naalu')
    expect(dealt[4]).toBe('sol')
    for (const i of [0, 2, 3, 5]) expect(dealt[i]).not.toBeNull()
    expect(dealt.slice(6)).toEqual([null, null])
  })

  it('repeats no faction across all rows, also the rows past the count', () => {
    // A row past the count can keep a faction from a larger count earlier.
    const rows = [null, null, null, null, null, 'arborec', 'letnev'] as const
    const dealt = dealFactions(rows, 5, ALL_OFF, sequence(0))
    expect(dealt).toEqual([
      'saar',
      'muaat',
      'hacan',
      'sol',
      'creuss',
      'arborec',
      'letnev',
    ])
    const spread = sequence(0.9, 0.1, 0.5, 0.99, 0, 0.3, 0.7, 0.5)
    const many = dealFactions(Array(8).fill(null), 8, ALL_ON, spread)
    expect(new Set(many).size).toBe(8)
  })

  it('gives only factions in play', () => {
    for (const value of [0, 0.25, 0.5, 0.75, 0.999]) {
      const dealt = dealFactions(
        Array(8).fill(null),
        8,
        ALL_OFF,
        sequence(value),
      )
      for (const id of dealt) expect(BASE).toContain(id)
    }
  })

  it('leaves the remaining seats empty when the pool runs out', () => {
    const rows = [...BASE.slice(0, 15), null, null, null, null]
    const dealt = dealFactions(rows, rows.length, ALL_OFF, sequence(0))
    expect(dealt.slice(15)).toEqual(['yin', 'yssaril', null, null])
  })

  it('takes its picks from the random source', () => {
    const empty = [null, null, null]
    expect(dealFactions(empty, 3, ALL_OFF, sequence(0))).toEqual([
      'arborec',
      'letnev',
      'saar',
    ])
    expect(dealFactions(empty, 3, ALL_OFF, sequence(0.999))).toEqual([
      'yssaril',
      'yin',
      'xxcha',
    ])
    // A pick of 0.5 from the 17 base factions takes the ninth, Mentak.
    expect(dealFactions([null], 1, ALL_OFF, sequence(0.5))).toEqual(['mentak'])
    const fixed = () => sequence(0.3, 0.9, 0.1, 0.6, 0.2, 0.8)
    expect(dealFactions(Array(6).fill(null), 6, ALL_ON, fixed())).toEqual(
      dealFactions(Array(6).fill(null), 6, ALL_ON, fixed()),
    )
  })

  it('keeps a pick in range when the source breaks its contract', () => {
    expect(dealFactions([null], 1, ALL_OFF, sequence(1))).toEqual(['yssaril'])
    expect(dealFactions([null], 1, ALL_OFF, sequence(-1))).toEqual(['arborec'])
  })
})
