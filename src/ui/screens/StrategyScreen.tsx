import { useState } from 'react'
import { STRATEGY_CARDS } from '../../model/rules'
import type { GameView, PhaseView } from '../../model/view'
import { pc } from '../colour'
import { plural, timerText } from '../format'
import { NaaluTokenPicker } from './NaaluTokenPicker'

type StrategyView = Extract<PhaseView, { phase: 'strategy' }>

export function StrategyScreen(props: {
  game: GameView
  view: StrategyView
  onPick: (playerId: string, card: number) => void
  onSpeaker: () => void
  onMoveNaaluToken: (playerId: string) => void
  onBegin: () => void
}) {
  const { game, view } = props
  const [picking, setPicking] = useState(false)
  const byId = new Map(game.players.map((p) => [p.id, p]))
  const picker = view.pickerId ? byId.get(view.pickerId) : undefined
  const taken = Object.keys(view.owners).length
  // Every player still in the game picks one card, or two at 3 or 4 players.
  const picks = game.pickOrder.length * game.cardsEach
  const remaining = picks - taken
  // With two cards each, the picker already holds one in the second round.
  const second = !!picker && Object.values(view.owners).includes(picker.id)
  const timer = game.timer?.kind === 'pick' ? game.timer : null
  const clock = timer ? timerText(timer.elapsedMs, timer.limitMs, true) : null
  // The Naalu "0" token exists only when a player has the Naalu faction.
  const owner = byId.get(view.naaluTokenOwnerId ?? '')
  const holder = byId.get(view.naaluTokenHolderId ?? '')
  const waiting = game.pickOrder.filter(
    (id) => !Object.values(view.owners).includes(id),
  )

  return (
    <>
      <div
        className="content"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <div className="picker" style={pc(picker?.colour)}>
          <div>
            <div className="lbl">
              {picker
                ? `Now picking · ${taken + 1} of ${picks}${second ? ' · second card' : ''}`
                : 'Every card is picked'}
            </div>
            <div className="who">
              {picker && <i />}
              {picker?.name ?? 'Ready for the action phase'}
            </div>
          </div>
          <div className="picker-help">
            Order follows the speaker. Tap a card to assign it.
          </div>
          <button
            className="ibtn spkb"
            style={{ marginLeft: 6, padding: '10px 14px' }}
            onClick={props.onSpeaker}
          >
            ★ Speaker: {byId.get(game.speakerId)?.name} · change
          </button>
          {clock && (
            <div className={`t num ${clock.over ? 'clock-over' : ''}`}>
              {clock.text}
            </div>
          )}
        </div>
        <div className="cards" style={{ flex: 1 }}>
          {STRATEGY_CARDS.map((card) => {
            const owner = byId.get(view.owners[card.number] ?? '')
            const goods = view.tradeGoods[card.number] ?? 0
            return (
              <button
                key={card.number}
                className={`card ${owner ? 'taken' : 'next'}`}
                style={pc(owner?.colour)}
                disabled={!!owner || !picker}
                onClick={() => picker && props.onPick(picker.id, card.number)}
              >
                {!owner && goods > 0 && <div className="tg">+{goods} TG</div>}
                <div className="n num">{card.number}</div>
                <div className="nm">{card.name}</div>
                {owner ? (
                  <div className="own">
                    <i />
                    {owner.name}
                  </div>
                ) : (
                  <div className="free">
                    {picker ? `Tap to assign to ${picker.name}` : 'Not picked'}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <div className="order-strip">
          <span className="lbl">Initiative order so far</span>
          {view.order.map(({ playerId, initiative }) => {
            const player = byId.get(playerId)
            return (
              <span key={playerId} className="oc" style={pc(player?.colour)}>
                <b>{initiative}</b>
                <i />
                {player?.name}
              </span>
            )
          })}
          {waiting.map((id) => (
            <span
              key={id}
              className="oc"
              style={{ '--pc': 'var(--line2)', color: 'var(--faint)' }}
            >
              <b>?</b>
              {byId.get(id)?.name}
            </span>
          ))}
          {owner && (
            <button
              className="ibtn tokb"
              style={pc(holder?.colour)}
              onClick={() => setPicking(true)}
            >
              <b>0</b>
              Naalu token: {holder?.name} · change
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: '0 22px 20px' }}>
        <button
          className="big"
          style={{ width: '100%' }}
          disabled={remaining > 0}
          onClick={props.onBegin}
        >
          {remaining > 0
            ? `BEGIN ACTION PHASE — ${plural(remaining, 'pick').toUpperCase()} REMAINING`
            : 'BEGIN ACTION PHASE'}
        </button>
      </div>
      {picking && owner && (
        <NaaluTokenPicker
          players={game.players.filter((p) => game.seated.includes(p.id))}
          ownerName={owner.name}
          holderId={view.naaluTokenHolderId}
          onPick={(playerId) => {
            setPicking(false)
            props.onMoveNaaluToken(playerId)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}
