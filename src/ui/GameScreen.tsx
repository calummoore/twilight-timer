import { useState } from 'react'
import { derive } from '../model/derive'
import type { Command, DeviceView } from '../model/protocol'
import { limitsNow, type Settings } from '../model/settings'
import type { ActionInput, Game } from '../model/types'
import { NetBar } from './controls'
import { GameOverlays, type Overlay } from './GameOverlays'
import { useAlarm, useClock, useConfirm, useHeight, useWakeLock } from './hooks'
import { rightsOf } from './rights'
import { ActionScreen } from './screens/ActionScreen'
import { AgendaScreen } from './screens/AgendaScreen'
import { RoundSummaryScreen } from './screens/RoundSummaryScreen'
import { StatsScreen } from './screens/StatsScreen'
import { StatusScreen } from './screens/StatusScreen'
import { StrategyScreen } from './screens/StrategyScreen'
import { TopBar } from './TopBar'

/**
 * The running game on one device. The game comes from the server, and each
 * tap goes to the server as a command. The clocks run on the server clock.
 */
export function GameScreen(props: {
  game: Game
  /** The revision of the game on the server, to which a confirm belongs. */
  revision: number
  /** The server clock minus the device clock, in ms. */
  offset: number
  settings: Settings
  onSettings: (settings: Settings) => void
  send: (command: Command) => void
  connected: boolean
  /** This device, or undefined before it joins. */
  device: DeviceView | undefined
  onPlayers: () => void
  onNewGame: () => void
}) {
  const [deviceNow] = useClock(250)
  const [overlay, setOverlay] = useState<Overlay>(null)
  // A tap on any device closes the End game confirm, also the end of the
  // game itself, so a reopened game does not show it again.
  const [ending, setEnding] = useConfirm<true>(props.revision)
  const [barHeight, barRef] = useHeight<HTMLDivElement>()
  const g = derive(props.game, deviceNow + props.offset)
  const rights = rightsOf(props.device, g, props.connected)
  const { alarming, silence } = useAlarm(g.timer, props.settings)
  useWakeLock(props.settings.keepAwake && g.view.phase !== 'ended')

  const { send } = props
  const dispatch = (input: ActionInput) => send({ type: 'act', input })
  const onUndo = () => send({ type: 'undo' })
  const speakerName = g.players.find((p) => p.id === g.speakerId)?.name ?? ''

  if (g.view.phase === 'ended') {
    return (
      <StatsScreen
        game={g}
        canReopen={rights.admin && g.canUndo}
        onUndo={onUndo}
        onNewGame={props.onNewGame}
      />
    )
  }

  const screen = (() => {
    const v = g.view
    switch (v.phase) {
      case 'strategy':
        return (
          <StrategyScreen
            game={g}
            view={v}
            rights={rights}
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
            revision={props.revision}
            rights={rights}
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
            rights={rights}
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
            rights={rights}
            onOpenVoting={() => dispatch({ kind: 'votingOpened' })}
            onVoteCast={() => dispatch({ kind: 'voteCast' })}
            onResolve={() => dispatch({ kind: 'agendaResolved' })}
          />
        )
      case 'summary':
        return (
          <RoundSummaryScreen
            game={g}
            rights={rights}
            onNextRound={() => dispatch({ kind: 'phaseStepped' })}
            onEndGame={() => setEnding(true)}
          />
        )
    }
  })()

  return (
    <div
      className={`lay ${props.connected ? '' : 'offline'}`}
      style={barHeight === null ? undefined : { '--top-h': `${barHeight}px` }}
    >
      <TopBar
        ref={barRef}
        round={g.round}
        phase={g.view.phase}
        speakerName={speakerName}
        gameMs={g.gameMs}
        device={props.device}
        seat={g.players.find((p) => p.id === props.device?.seat)}
        canUndo={rights.admin && g.canUndo}
        canPause={rights.admin}
        onSpeaker={() => setOverlay('seating')}
        onPlayers={props.onPlayers}
        onUndo={onUndo}
        onPause={() => send({ type: 'pause' })}
        onSettings={() => setOverlay('settings')}
      />
      {!props.connected && <NetBar />}
      {screen}
      <GameOverlays
        game={g}
        overlay={overlay}
        onOverlay={setOverlay}
        ending={ending !== null}
        onEnding={(open) => setEnding(open ? true : null)}
        rights={rights}
        send={send}
        settings={props.settings}
        onSettings={props.onSettings}
        limits={limitsNow(props.game.limitsLog)}
      />
    </div>
  )
}
