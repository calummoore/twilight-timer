import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type RefCallback,
} from 'react'

/** A move further than this, in px, is a drag or a scroll, not a tap. */
const SLOP_PX = 8

/** A point this close to an item, in px, is over it, so a gap holds the target. */
const NEAR_PX = 12

/** For each item that moves, the item whose place it takes. */
export type Places = ReadonlyMap<string, string>

export interface DragReorderOptions {
  /**
   * How a press becomes a drag: after a hold of this many ms in place, or,
   * with null, as soon as the pointer moves past the slop. A move before the
   * hold ends the press, so the page can scroll.
   */
  holdMs: number | null
  /** Whether a press on the item may become a drag now. */
  canDrag: (id: string) => boolean
  /** Where the other items go while the held item is over the target. */
  arrange: (heldId: string, targetId: string) => Places
  /** A hold started a drag. */
  onHold?: () => void
  /** The held item was dropped on another item. */
  onDrop: (heldId: string, targetId: string) => void
}

/** A move of an item in px, for the CSS `translate` of the item. */
export interface Shift {
  x: number
  y: number
}

export interface DragReorder {
  /** The item that the pointer holds, or null. */
  heldId: string | null
  /**
   * Where an item moves during a drag: the held item follows the pointer, and
   * the items that `arrange` names slide into their new places. Null for an
   * item that stays in its place.
   */
  shift: (id: string) => Shift | null
  /** Starts a press on an item, from the item or from its handle. */
  press: (id: string, e: PointerEvent<HTMLElement>) => void
  /** Props for the element around the items. */
  scope: {
    ref: RefCallback<HTMLElement>
    onClickCapture: (e: MouseEvent) => void
    onPointerDownCapture: () => void
    onKeyDownCapture: () => void
  }
}

interface Drag {
  heldId: string
  /** The item under the pointer, other than the held item, or null. */
  overId: string | null
  /** The new places of the other items for that target. */
  places: Places
  /** How far the pointer moved since the press, in px. */
  shift: Shift
  /** The place of each item when the drag started, by id, in the scope. */
  homes: ReadonlyMap<string, DOMRect>
}

const NO_PLACES: Places = new Map()

/**
 * Drag one item to the place of another, with a pointer: a finger, a pen, or
 * a mouse. The screen says where the other items go. Each item has a
 * `data-drag-id` attribute inside the scope element. The drag finds its
 * target in the places of the items at its start, because the items slide
 * away from under the pointer. Places and points count from the scope
 * element, so a layout change above it during a drag, such as a shorter
 * note when re-order mode starts, moves them with the items. A point in a
 * narrow gap keeps the nearest item. While an item is held, the scope blocks the page scroll, because iOS
 * Safari keeps the `touch-action` of a touch that has started. The click
 * after a drag or a hold is not a tap.
 */
export function useDragReorder(options: DragReorderOptions): DragReorder {
  const [drag, setDrag] = useState<Drag | null>(null)
  const latest = useRef(options)
  const scopeEl = useRef<HTMLElement | null>(null)
  /** Ends the press that runs now, or null. */
  const endPress = useRef<(() => void) | null>(null)
  const held = useRef(false)
  const swallow = useRef(false)

  useEffect(() => {
    latest.current = options
  })
  // A press that outlives the screen ends with it.
  useEffect(() => () => endPress.current?.(), [])

  const press = (id: string, e: PointerEvent<HTMLElement>) => {
    const { holdMs, canDrag } = latest.current
    if (!e.isPrimary || e.button !== 0 || !canDrag(id)) return
    // A press whose release never came ends here.
    endPress.current?.()
    const { pointerId } = e
    const p0 = inScope(e.clientX, e.clientY)
    let current: Drag | null = null
    let last: Shift = { x: 0, y: 0 }
    let timer: ReturnType<typeof setTimeout> | undefined

    const show = (next: Drag | null) => {
      current = next
      held.current = next !== null
      setDrag(next)
    }
    const start = (hold: boolean) => {
      const homes = measure()
      show({ heldId: id, overId: null, places: NO_PLACES, shift: last, homes })
      if (hold) latest.current.onHold?.()
    }
    const move = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const p = inScope(ev.clientX, ev.clientY)
      last = { x: p.x - p0.x, y: p.y - p0.y }
      if (!current) {
        if (Math.hypot(last.x, last.y) <= SLOP_PX) return
        if (holdMs !== null) return end()
        start(false)
      }
      if (!current) return
      const found = hit(current.homes, p.x, p.y)
      // Over the held item's own place, nothing moves.
      const overId = found === id ? null : found
      const places =
        overId === null
          ? NO_PLACES
          : overId === current.overId
            ? current.places
            : latest.current.arrange(id, overId)
      show({ ...current, overId, places, shift: last })
    }
    const up = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const dropped = current
      end()
      if (!dropped) return
      swallow.current = true
      if (dropped.overId !== null) latest.current.onDrop(id, dropped.overId)
    }
    const cancel = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId === pointerId) end()
    }
    const end = () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      endPress.current = null
      if (current) show(null)
    }

    endPress.current = end
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    if (holdMs !== null) timer = setTimeout(() => start(true), holdMs)
  }

  /** The top left corner of the scope element on the page. */
  const origin = (): Shift => {
    const r = scopeEl.current?.getBoundingClientRect()
    return { x: r?.left ?? 0, y: r?.top ?? 0 }
  }

  /** A point of the page, counted from the scope element. */
  const inScope = (x: number, y: number): Shift => {
    const o = origin()
    return { x: x - o.x, y: y - o.y }
  }

  /** The place of each item that takes a drop, counted from the scope. */
  const measure = (): Map<string, DOMRect> => {
    const homes = new Map<string, DOMRect>()
    const o = origin()
    const items = scopeEl.current?.querySelectorAll('[data-drag-id]') ?? []
    for (const el of items) {
      const id = el.getAttribute('data-drag-id')
      const r = el.getBoundingClientRect()
      if (id !== null) {
        homes.set(id, new DOMRect(r.x - o.x, r.y - o.y, r.width, r.height))
      }
    }
    return homes
  }

  const ref = useCallback((el: HTMLElement | null) => {
    scopeEl.current = el
    if (!el) return
    const block = (e: TouchEvent) => {
      if (held.current && e.cancelable) e.preventDefault()
    }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [])

  return {
    heldId: drag?.heldId ?? null,
    shift: (id) => (drag ? shiftOf(drag, id) : null),
    press,
    scope: {
      ref,
      onClickCapture: (e) => {
        if (!swallow.current) return
        swallow.current = false
        e.stopPropagation()
        e.preventDefault()
      },
      // A drag that ends outside the scope gets no click, so the next press
      // or key starts clean.
      onPointerDownCapture: () => {
        swallow.current = false
      },
      onKeyDownCapture: () => {
        swallow.current = false
      },
    },
  }
}

/** The item whose place holds the point, or is nearest within NEAR_PX. */
function hit(
  homes: ReadonlyMap<string, DOMRect>,
  x: number,
  y: number,
): string | null {
  let best: string | null = null
  let bestPx = NEAR_PX
  for (const [id, r] of homes) {
    const dx = Math.max(r.left - x, 0, x - r.right)
    const dy = Math.max(r.top - y, 0, y - r.bottom)
    const px = Math.hypot(dx, dy)
    if (px === 0) return id
    if (px < bestPx) [best, bestPx] = [id, px]
  }
  return best
}

function shiftOf(drag: Drag, id: string): Shift | null {
  if (id === drag.heldId) return drag.shift
  const placeId = drag.places.get(id)
  const from = drag.homes.get(id)
  const to = placeId === undefined ? undefined : drag.homes.get(placeId)
  if (!from || !to) return null
  return { x: centre(to).x - centre(from).x, y: centre(to).y - centre(from).y }
}

function centre(r: DOMRect): Shift {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
