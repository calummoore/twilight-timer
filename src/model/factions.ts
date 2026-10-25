/**
 * The expansions that add factions to the base game. The Council Keleres has
 * its own choice: it came in Codex III, and the Thunder's Edge box also holds
 * it.
 */
export const EXPANSIONS = [
  { id: 'pok', name: 'Prophecy of Kings' },
  { id: 'te', name: "Thunder's Edge" },
  { id: 'keleres', name: 'Council Keleres' },
] as const

export type ExpansionId = (typeof EXPANSIONS)[number]['id']

/** The base game, or the expansion that adds a faction. */
export type GameSet = 'base' | ExpansionId

/**
 * The official factions: the base game, Prophecy of Kings, the codices, and
 * Thunder's Edge, in name order, each with its game set. Saved games store
 * the id, so an id never changes.
 */
export const FACTIONS = [
  { id: 'arborec', name: 'Arborec', set: 'base' },
  { id: 'argent', name: 'Argent Flight', set: 'pok' },
  { id: 'letnev', name: 'Barony of Letnev', set: 'base' },
  { id: 'saar', name: 'Clan of Saar', set: 'base' },
  { id: 'keleres', name: 'Council Keleres', set: 'keleres' },
  { id: 'crimson', name: 'Crimson Rebellion', set: 'te' },
  { id: 'deepwrought', name: 'Deepwrought Scholarate', set: 'te' },
  { id: 'muaat', name: 'Embers of Muaat', set: 'base' },
  { id: 'hacan', name: 'Emirates of Hacan', set: 'base' },
  { id: 'empyrean', name: 'Empyrean', set: 'pok' },
  { id: 'sol', name: 'Federation of Sol', set: 'base' },
  { id: 'firmament', name: 'Firmament / Obsidian', set: 'te' },
  { id: 'creuss', name: 'Ghosts of Creuss', set: 'base' },
  { id: 'l1z1x', name: 'L1Z1X Mindnet', set: 'base' },
  { id: 'bastion', name: 'Last Bastion', set: 'te' },
  { id: 'mahact', name: 'Mahact Gene-Sorcerers', set: 'pok' },
  { id: 'mentak', name: 'Mentak Coalition', set: 'base' },
  { id: 'naalu', name: 'Naalu Collective', set: 'base' },
  { id: 'naazrokha', name: 'Naaz-Rokha Alliance', set: 'pok' },
  { id: 'nekro', name: 'Nekro Virus', set: 'base' },
  { id: 'nomad', name: 'Nomad', set: 'pok' },
  { id: 'ralnel', name: 'Ral Nel Consortium', set: 'te' },
  { id: 'sardakk', name: "Sardakk N'orr", set: 'base' },
  { id: 'titans', name: 'Titans of Ul', set: 'pok' },
  { id: 'jolnar', name: 'Universities of Jol-Nar', set: 'base' },
  { id: 'cabal', name: "Vuil'raith Cabal", set: 'pok' },
  { id: 'winnu', name: 'Winnu', set: 'base' },
  { id: 'xxcha', name: 'Xxcha Kingdom', set: 'base' },
  { id: 'yin', name: 'Yin Brotherhood', set: 'base' },
  { id: 'yssaril', name: 'Yssaril Tribes', set: 'base' },
] as const satisfies readonly { id: string; name: string; set: GameSet }[]

export type FactionId = (typeof FACTIONS)[number]['id']

/** The faction whose "0" token puts its holder first in initiative order. */
export const NAALU: FactionId = 'naalu'

export function isFactionId(raw: unknown): raw is FactionId {
  return FACTIONS.some((f) => f.id === raw)
}

/**
 * The faction name. A player in a game from an older build can have no
 * faction, and then the name is an empty string.
 */
export function factionName(id: FactionId | null): string {
  return FACTIONS.find((f) => f.id === id)?.name ?? ''
}
