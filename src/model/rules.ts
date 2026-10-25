/** Twilight Imperium constants that the game model and the screens share. */

export const COLOURS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'black',
] as const
export type Colour = (typeof COLOURS)[number]

/** Setup offers 3 to 8 players. */
export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 8
export const DEFAULT_PLAYERS = 6

/**
 * The strategy cards that each player picks in a round: two in a game that
 * starts with three or four players, else one. The player count at the start
 * sets it, so it stays when a player leaves.
 */
export function cardsEach(playerCount: number): number {
  return playerCount <= 4 ? 2 : 1
}

export const STRATEGY_CARDS = [
  { number: 1, name: 'Leadership' },
  { number: 2, name: 'Diplomacy' },
  { number: 3, name: 'Politics' },
  { number: 4, name: 'Construction' },
  { number: 5, name: 'Trade' },
  { number: 6, name: 'Warfare' },
  { number: 7, name: 'Technology' },
  { number: 8, name: 'Imperial' },
] as const

/** Its primary ability hands the speaker token to a player who lacks it. */
export const POLITICS = 3

export function isStrategyCard(card: number): boolean {
  return STRATEGY_CARDS.some((c) => c.number === card)
}

export function cardName(card: number): string {
  return STRATEGY_CARDS.find((c) => c.number === card)?.name ?? `Card ${card}`
}

export const STATUS_STEPS = [
  { label: 'Score objectives', note: '1 public + 1 secret' },
  { label: 'Reveal public objective', note: 'Speaker reveals' },
  { label: 'Draw action cards', note: '1 each, in initiative order' },
  { label: 'Remove command tokens', note: 'From the board' },
  { label: 'Gain and redistribute command tokens', note: '2 each' },
  { label: 'Ready cards', note: 'All exhausted cards' },
  { label: 'Repair units', note: 'All damaged units' },
] as const

/** Each round has two agendas once the Custodians token is gone. */
export const AGENDAS_PER_ROUND = 2
