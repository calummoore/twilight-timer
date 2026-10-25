import { useState } from 'react'
import { act, pause, resume, setPauseReason, undo } from '../model/commands'
import { derive } from '../model/derive'
import type { Settings } from '../model/settings'
import type { ActionInput, Game } from '../model/types'
import { Dialog } from './controls'
import { useAlarm, useClock, useHeight, useWakeLock } from './hooks'
import { ActionScreen } from './screens/ActionScreen'
import { AgendaScreen } from './screens/AgendaScreen'
import { PauseOverlay } from './screens/PauseOverlay'
import { ReactionOverlay } from './screens/ReactionOverlay'
import { RoundSummaryScreen } from './screens/RoundSummaryScreen'
import { SeatingScreen } from './screens/SeatingScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StatsScreen } from './screens/StatsScreen'
import { StatusScreen } from './screens/StatusScreen'
import { StrategyScreen } from './screens/StrategyScreen'
import { TopBar } from './TopBar'

type Overlay = 'settings' | 'seating' | 'endGame' | null

export function GameScreen(props: {
  game: Game
  settings: Settings
  onGame: (update: (game: Game, now: number) => Game) => void
  onSettings: (settings: Settings) => void
  onNewGame: () => void
}) {
  const [now, refresh] = useClock(250)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [barHeight, barRef] = useHeight<HTMLDivElement>()
  const g = derive(props.game, now)
  const { alarming, silence } = useAlarm(g.timer, props.settings)
  useWakeLock(props.settings.keepAwake && g.view.phase !== 'ended')

  const update = (fn: (game: Game, at: number) => Game) => {
    props.onGame(fn)
    refresh()
  }
  const dispatch = (input: ActionInput) =>
    update((game, at) => act(game, input, at))
  const onUndo = () => update(undo)
  const speakerName = g.players.find((p) => p.id === g.speakerId)?.name ?? ''

  if (g.view.phase === 'ended') {
    return <StatsScreen game={g} onUndo={onUndo} onNewGame={props.onNewGame} />
  }

  const screen = (() => {
    const v = g.view
    switch (v.phase) {
      case 'strategy':
        return (
          <StrategyScreen
            game={g}
            view={v}
            onPick={(playerId, card) =>
              dispatch({ kind: 'cardPicked', playerId, card })
            }
            onSpeaker={() => setOverlay('seating')}
            onMoveNaaluToken={(playerId) =>
              dispatch({ kind: 'naaluTokenMoved', playerId })
            }
            onBegin={() => dispatch({ kind: 'phaseStepped' })}
          />
        )
      case 'action':
        return (
          <ActionScreen
            game={g}
            view={v}
            showCumulative={props.settings.showCumulative}
            alarming={alarming}
            onSilence={silence}
            onEndTurn={() => dispatch({ kind: 'turnEnded' })}
            onPlayCard={(card) =>
              dispatch({ kind: 'strategyCardPlayed', card })
            }
            onPass={() => dispatch({ kind: 'passed' })}
          />
        )
      case 'status':
        return (
          <StatusScreen
            game={g}
            view={v}
            onToggleStep={(step) =>
              dispatch({ kind: 'statusStepToggled', step })
            }
            onCustodians={(removed) =>
              dispatch({ kind: 'custodiansSet', removed })
            }
            onNext={() => dispatch({ kind: 'phaseStepped' })}
          />
        )
      case 'agenda':
        return (
          <AgendaScreen
            game={g}
            view={v}
            onOpenVoting={() => dispatch({ kind: 'votingOpened' })}
            onVoteCast={() => dispatch({ kind: 'voteCast' })}
            onResolve={() => dispatch({ kind: 'agendaResolved' })}
          />
        )
      case 'summary':
        return (
          <RoundSummaryScreen
            game={g}
            onNextRound={() => dispatch({ kind: 'phaseStepped' })}
            onEndGame={() => setOverlay('endGame')}
          />
        )
    }
  })()

  const reaction = g.view.phase === 'action' ? g.view.reaction : null

  return (
    <div
      className="lay"
      style={barHeight === null ? undefined : { '--top-h': `${barHeight}px` }}
    >
      <TopBar
        ref={barRef}
        round={g.round}
        phase={g.view.phase}
        speakerName={speakerName}
        gameMs={g.gameMs}
        canUndo={g.canUndo}
        onSpeaker={() => setOverlay('seating')}
        onUndo={onUndo}
        onPause={() => update(pause)}
        onSettings={() => setOverlay('settings')}
      />
      {screen}
      {reaction && (
        <ReactionOverlay
          game={g}
          reaction={reaction}
          onDone={(playerId) => dispatch({ kind: 'reactionDone', playerId })}
          onExtend={(ms) => dispatch({ kind: 'reactionExtended', ms })}
          onSpeaker={(playerId) => dispatch({ kind: 'speakerMoved', playerId })}
          onClose={() => dispatch({ kind: 'reactionClosed' })}
        />
      )}
      {overlay === 'seating' && (
        <SeatingScreen
          round={g.round}
          players={g.players}
          seated={g.seated}
          departures={g.departures}
          speakerId={g.speakerId}
          pickOrder={g.pickOrder}
          voteOrder={g.voteOrder}
          canUndo={g.canUndo}
          onSpeaker={(playerId) => dispatch({ kind: 'speakerMoved', playerId })}
          onRemove={(playerId) => dispatch({ kind: 'playerRemoved', playerId })}
          onUndo={onUndo}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay === 'settings' && (
        <SettingsScreen
          settings={props.settings}
          onChange={props.onSettings}
          onClose={() => setOverlay(null)}
          onEndGame={() => setOverlay('endGame')}
        />
      )}
      {overlay === 'endGame' && (
        <Dialog
          title="End the game?"
          confirm={{
            label: 'End game',
            danger: true,
            onConfirm: () => {
              setOverlay(null)
              dispatch({ kind: 'gameEnded' })
            },
          }}
          onCancel={() => setOverlay(null)}
        >
          Every clock stops and the post-game stats open. You can reopen the
          game from there.
        </Dialog>
      )}
      {g.pause && (
        <PauseOverlay
          pause={g.pause}
          onReason={(reason) =>
            update((game, at) => setPauseReason(game, reason, at))
          }
          onResume={() => update(resume)}
        />
      )}
    </div>
  )
}
