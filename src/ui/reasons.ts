import type { PauseReason } from '../model/types'
import { plural } from './format'

/** The words for each pause reason. Each new reason needs its own entry. */
const WORDS: Record<
  PauseReason,
  { label: string; title: string; one: string }
> = {
  ruleCheck: { label: 'Rule check', title: 'Rule checks', one: 'rule check' },
}

/** The choice on the pause card: "Rule check", or "Pause" for a plain pause. */
export function reasonLabel(reason: PauseReason | null): string {
  return reason === null ? 'Pause' : WORDS[reason].label
}

/** The title of a reason on the stats: "Rule checks". */
export function reasonTitle(reason: PauseReason): string {
  return WORDS[reason].title
}

/** "1 rule check" or "7 rule checks". */
export function reasonCount(reason: PauseReason, count: number): string {
  return plural(count, WORDS[reason].one)
}
