import { movedIndex } from '../model/list-move'
import type { Places } from './useDragReorder'

/**
 * The places during a drag of the item at `from` over the item at `to`: the
 * items between shift by one toward the gap. The ids are the indices as text.
 */
export function listPlaces(from: number, to: number): Places {
  const places = new Map<string, string>()
  const step = from < to ? 1 : -1
  for (let i = from + step; i !== to + step; i += step) {
    places.set(String(i), String(movedIndex(i, from, to)))
  }
  return places
}
