/**
 * The official factions: the base game, Prophecy of Kings, the codices, and
 * Thunder's Edge, in name order. Saved games store the id, so an id never
 * changes.
 */
export const FACTIONS = [
  { id: 'arborec', name: 'Arborec' },
  { id: 'argent', name: 'Argent Flight' },
  { id: 'letnev', name: 'Barony of Letnev' },
  { id: 'saar', name: 'Clan of Saar' },
  { id: 'keleres', name: 'Council Keleres' },
  { id: 'crimson', name: 'Crimson Rebellion' },
  { id: 'deepwrought', name: 'Deepwrought Scholarate' },
  { id: 'muaat', name: 'Embers of Muaat' },
  { id: 'hacan', name: 'Emirates of Hacan' },
  { id: 'empyrean', name: 'Empyrean' },
  { id: 'sol', name: 'Federation of Sol' },
  { id: 'firmament', name: 'Firmament / Obsidian' },
  { id: 'creuss', name: 'Ghosts of Creuss' },
  { id: 'l1z1x', name: 'L1Z1X Mindnet' },
  { id: 'bastion', name: 'Last Bastion' },
  { id: 'mahact', name: 'Mahact Gene-Sorcerers' },
  { id: 'mentak', name: 'Mentak Coalition' },
  { id: 'naalu', name: 'Naalu Collective' },
  { id: 'naazrokha', name: 'Naaz-Rokha Alliance' },
  { id: 'nekro', name: 'Nekro Virus' },
  { id: 'nomad', name: 'Nomad' },
  { id: 'ralnel', name: 'Ral Nel Consortium' },
  { id: 'sardakk', name: "Sardakk N'orr" },
  { id: 'titans', name: 'Titans of Ul' },
  { id: 'jolnar', name: 'Universities of Jol-Nar' },
  { id: 'cabal', name: "Vuil'raith Cabal" },
  { id: 'winnu', name: 'Winnu' },
  { id: 'xxcha', name: 'Xxcha Kingdom' },
  { id: 'yin', name: 'Yin Brotherhood' },
  { id: 'yssaril', name: 'Yssaril Tribes' },
] as const

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
