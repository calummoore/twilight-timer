import type { Command } from '../model/protocol'
import type { LimitSettings, Settings } from '../model/settings'
import type { ActionInput } from '../model/types'
import type { GameView } from '../model/view'
import { Dialog } from './controls'
import type { Rights } from './rights'
import { PauseOverlay } from './screens/PauseOverlay'
import { ReactionOverlay } from './screens/ReactionOverlay'
import { SeatingScreen } from './screens/SeatingScreen'
import { SettingsScreen } from './screens/SettingsScreen'

/** The screens that a tap opens over the game. */
export type Overlay = 'settings' | 'seating' | null

/**
 * Everything over the game screen: the reaction window, the screen that a
 * tap opened, and the pause card over all of them.
 */
export function GameOverlays(props: {
  game: GameView
  overlay: Overlay
  onOverlay: (overlay: Overlay) => void
  /** The End game confirm is open. */
  ending: boolean
  onEnding: (open: boolean) => void
  rights: Rights
  send: (command: Command) => void
  settings: Settings
  onSettings: (settings: Settings) => void
  /** The time limits of the game, in force from now on. */
  limits: LimitSettings
}) {
  const { game: g, rights, send } = props
  const dispatch = (input: ActionInput) => send({ type: 'act', input })
  const close = () => props.onOverlay(null)
  const reaction = g.view.phase === 'action' ? g.view.reaction : null
  // An admin device changes the limits of the game, and keeps them for its
  // next setup.
  const onLimits = (limits: LimitSettings) => {
    send({ type: 'limits', ...limits })
    props.onSettings({ ...props.settings, ...limits })
  }

  return (
    <>
      {reaction && (
        <ReactionOverlay
          game={g}
          reaction={reaction}
          rights={rights}
          onDone={(playerId) => dispatch({ kind: 'reactionDone', playerId })}
          onExtend={(ms) => dispatch({ kind: 'reactionExtended', ms })}
          onSpeaker={(playerId) => dispatch({ kind: 'speakerMoved', playerId })}
          onClose={() => dispatch({ kind: 'reactionClosed' })}
        />
      )}
      {props.overlay === 'seating' && (
        <SeatingScreen
          round={g.round}
          players={g.players}
          seated={g.seated}
          departures={g.departures}
          speakerId={g.speakerId}
          pickOrder={g.pickOrder}
          voteOrder={g.voteOrder}
          canUndo={rights.admin && g.canUndo}
          maySpeaker={(playerId) =>
            rights.may({ kind: 'speakerMoved', playerId })
          }
          canRemove={rights.admin}
          onSpeaker={(playerId) => dispatch({ kind: 'speakerMoved', playerId })}
          onRemove={(playerId) => dispatch({ kind: 'playerRemoved', playerId })}
          onUndo={() => send({ type: 'undo' })}
          onClose={close}
        />
      )}
      {props.overlay === 'settings' && (
        <SettingsScreen
          settings={props.settings}
          onChange={props.onSettings}
          limits={props.limits}
          onLimits={rights.admin ? onLimits : undefined}
          endGame={{
            allowed: rights.may({ kind: 'gameEnded' }),
            onEnd: () => {
              close()
              props.onEnding(true)
            },
          }}
          onClose={close}
        />
      )}
      {props.ending && (
        <Dialog
          title="End the game?"
          confirm={{
            label: 'End game',
            danger: true,
            onConfirm: () => {
              props.onEnding(false)
              dispatch({ kind: 'gameEnded' })
            },
          }}
          onCancel={() => props.onEnding(false)}
        >
          Every clock stops and the post-game stats open. You can reopen the
          game from there.
        </Dialog>
      )}
      {g.pause && (
        <PauseOverlay
          pause={g.pause}
          canChange={rights.admin}
          onReason={(reason) => send({ type: 'pauseReason', reason })}
          onResume={() => send({ type: 'resume' })}
        />
      )}
    </>
  )
}
