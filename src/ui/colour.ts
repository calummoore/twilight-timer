import type { CSSProperties } from 'react'
import type { Colour } from '../model/rules'

/** Sets the player colour that the mockup styles read as `--pc`. */
export function pc(colour: Colour | undefined): CSSProperties {
  return colour ? { '--pc': `var(--c-${colour})` } : {}
}
