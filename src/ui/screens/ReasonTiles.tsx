import type { ReasonTotal } from '../../model/pauses'
import { clock } from '../format'
import { reasonCount, reasonTitle } from '../reasons'

/** One stat tile for each pause reason: its time and its count. */
export function ReasonTiles(props: { totals: ReasonTotal[] }) {
  return props.totals.map((total) => (
    <div key={total.reason} className="stat">
      <div className="l">{reasonTitle(total.reason)}</div>
      <div className="v num">{clock(total.ms)}</div>
      <div className="s">
        {reasonCount(total.reason, total.count)} · while paused
      </div>
    </div>
  ))
}
