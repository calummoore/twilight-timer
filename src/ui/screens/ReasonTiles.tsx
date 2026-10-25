import type { ReasonTotal } from '../../model/pauses'
import { clock, percent } from '../format'
import { reasonCount, reasonTitle } from '../reasons'

/** One stat tile for each pause reason: its time, its count, and its share. */
export function ReasonTiles(props: { totals: ReasonTotal[]; gameMs: number }) {
  return props.totals.map((total) => (
    <div key={total.reason} className="stat">
      <div className="l">{reasonTitle(total.reason)}</div>
      <div className="v num">{clock(total.ms)}</div>
      <div className="s">
        {reasonCount(total.reason, total.count)} ·{' '}
        {percent(total.ms, props.gameMs)} of the game
      </div>
    </div>
  ))
}
