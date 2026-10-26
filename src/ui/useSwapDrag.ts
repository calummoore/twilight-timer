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

export interface SwapDragOptions {
  /**
   * How a press becomes a drag: after a hold of this many ms in place, or,
   * with null, as soon as the pointer moves past the slop. A move before the
   * hold ends the press, so the page can scroll.
   */
  holdMs: number | null
  /** Whether a press on the item may become a drag now. */
  canDrag: (id: string) => boolean
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

export interface SwapDrag {
  /** The item that the pointer holds, or null. */
  heldId: string | null
  /**
   * Where an item moves during a drag: the held item follows the pointer, and
   * the item under the pointer slides into the place that the held item left.
   * Null for an item that stays in its place.
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
  /** How far the pointer moved since the press, in px. */
  shift: Shift
  /** The place of each item when the drag started, by id. */
  homes: ReadonlyMap<string, DOMRect>
}

/**
 * Drag one item onto another to swap them, with a pointer: a finger, a pen,
 * or a mouse. Each item has a `data-swap-id` attribute inside the scope
 * element. The drag finds its target in the places of the items at its
 * start, because the target slides away from under the pointer. While an
 * item is held, the scope blocks the page scroll, because iOS Safari keeps
 * the `touch-action` of a touch that has started. The click after a drag or
 * a hold is not a tap.
 */
export function useSwapDrag(options: SwapDragOptions): SwapDrag {
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
    const { pointerId, clientX: x0, clientY: y0 } = e
    let current: Drag | null = null
    let last: Shift = { x: 0, y: 0 }
    let timer: ReturnType<typeof setTimeout> | undefined

    const show = (next: Drag | null) => {
      current = next
      held.current = next !== null
      setDrag(next)
    }
    const start = (hold: boolean) => {
      show({ heldId: id, overId: null, shift: last, homes: measure() })
      if (hold) latest.current.onHold?.()
    }
    const move = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      last = { x: ev.clientX - x0, y: ev.clientY - y0 }
      if (!current) {
        if (Math.hypot(last.x, last.y) <= SLOP_PX) return
        if (holdMs !== null) return end()
        start(false)
      }
      if (!current) return
      const overId = hit(current.homes, ev.clientX, ev.clientY, id)
      show({ ...current, overId, shift: last })
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

  /** The place of each item that takes a drop, inside the scope. */
  const measure = (): Map<string, DOMRect> => {
    const homes = new Map<string, DOMRect>()
    const items = scopeEl.current?.querySelectorAll('[data-swap-id]') ?? []
    for (const el of items) {
      const id = el.getAttribute('data-swap-id')
      if (id !== null) homes.set(id, el.getBoundingClientRect())
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

/** The item whose place holds the point, other than the held item. */
function hit(
  homes: ReadonlyMap<string, DOMRect>,
  x: number,
  y: number,
  heldId: string,
): string | null {
  for (const [id, r] of homes) {
    if (id === heldId) continue
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id
  }
  return null
}

function shiftOf(drag: Drag, id: string): Shift | null {
  if (id === drag.heldId) return drag.shift
  if (id !== drag.overId) return null
  const from = drag.homes.get(id)
  const to = drag.homes.get(drag.heldId)
  if (!from || !to) return null
  return { x: centre(to).x - centre(from).x, y: centre(to).y - centre(from).y }
}

function centre(r: DOMRect): Shift {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
