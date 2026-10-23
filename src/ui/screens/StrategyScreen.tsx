import { STRATEGY_CARDS } from '../../model/rules'
import type { GameView, PhaseView } from '../../model/view'
import { pc } from '../colour'
import { timerText } from '../format'

type StrategyView = Extract<PhaseView, { phase: 'strategy' }>

export function StrategyScreen(props: {
  game: GameView
  view: StrategyView
  onPick: (playerId: string, card: number) => void
  onSpeaker: () => void
  onBegin: () => void
}) {
  const { game, view } = props
  const byId = new Map(game.players.map((p) => [p.id, p]))
  const picker = view.pickerId ? byId.get(view.pickerId) : undefined
  const taken = Object.keys(view.owners).length
  const remaining = game.players.length - taken
  const timer = game.timer?.kind === 'pick' ? game.timer : null
  const clock = timer ? timerText(timer.elapsedMs, timer.limitMs, true) : null
  const ordered = Object.entries(view.owners)
    .map(([card, id]) => ({ card: Number(card), player: byId.get(id) }))
    .sort((a, b) => a.card - b.card)
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
          <div className="who-box">
            <div className="lbl">
              {picker
                ? `Now picking · ${taken + 1} of ${game.players.length}`
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
          <button className="ibtn spkb" onClick={props.onSpeaker}>
            ★ Speaker: {byId.get(game.speakerId)?.name} · change
          </button>
          {clock && (
            <div className={`t num ${clock.over ? 'clock-over' : ''}`}>
              {clock.text}
            </div>
          )}
        </div>
        <div className="cards grow">
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
          {ordered.map(({ card, player }) => (
            <span key={card} className="oc" style={pc(player?.colour)}>
              <b>{card}</b>
              <i />
              {player?.name}
            </span>
          ))}
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
        </div>
      </div>
      <div className="foot">
        <button
          className="big"
          disabled={remaining > 0}
          onClick={props.onBegin}
        >
          {remaining > 0
            ? `BEGIN ACTION PHASE — ${remaining} ${remaining === 1 ? 'PICK' : 'PICKS'} REMAINING`
            : 'BEGIN ACTION PHASE'}
        </button>
      </div>
    </>
  )
}
