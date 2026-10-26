import type { GameSummary } from '../model/summary'
import type { Phase } from '../model/types'
import { plural } from './format'

const PHASE_NAMES: Record<Exclude<Phase, 'ended'>, string> = {
  strategy: 'Strategy phase',
  action: 'Action phase',
  status: 'Status phase',
  agenda: 'Agenda phase',
  summary: 'Round summary',
}

/** "6 players · Round 3 · Action phase", as a list of games shows a game. */
export function summaryText({ players, round, phase }: GameSummary): string {
  const who = plural(players, 'player')
  if (phase === 'lobby') return `${who} · Lobby`
  if (phase === 'ended') {
    return `${who} · ${plural(round, 'round')} · Game complete`
  }
  return `${who} · Round ${round} · ${PHASE_NAMES[phase]}`
}
