import type { ActionInput, Intent } from './types'
import type { GameView } from './view'

/**
 * Names the target of a tap from the view that the screen showed. Returns
 * null when the view has nothing for the tap to act on.
 */
export function aim(view: GameView, intent: Intent): ActionInput | null {
  const { clock } = view
  const v = view.view
  switch (intent.kind) {
    case 'statusStepSet':
    case 'custodiansSet':
    case 'speakerMoved':
    case 'gameEnded':
      return intent
    case 'cardPicked':
    case 'reactionDone':
      return clock === null ? null : { ...intent, clock }
    case 'phaseStepped':
    case 'reactionClosed':
    case 'votingOpened':
    case 'agendaResolved':
      return clock === null ? null : { kind: intent.kind, clock }
    case 'turnEnded':
    case 'passed':
    case 'strategyCardPlayed':
      if (clock === null || v.phase !== 'action' || !v.activeId) return null
      return { kind: intent.kind, clock, playerId: v.activeId }
    case 'reactionExtended': {
      const r = v.phase === 'action' ? v.reaction : null
      if (clock === null || !r || r.limitMs === null) return null
      return { kind: intent.kind, clock, ms: intent.ms, fromMs: r.limitMs }
    }
    case 'voteCast': {
      const voter =
        v.phase === 'agenda' ? v.voters.find((x) => x.state === 'now') : null
      if (clock === null || !voter) return null
      return { kind: intent.kind, clock, playerId: voter.playerId }
    }
  }
}
