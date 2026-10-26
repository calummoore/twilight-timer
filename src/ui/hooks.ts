import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
} from 'react'
import type { Settings } from '../model/settings'
import type { Game } from '../model/types'
import type { TimerView } from '../model/view'
import { playAlarm } from './alarm'

/** The current time, refreshed on an interval and on demand after a tap. */
export function useClock(intervalMs: number): [number, () => void] {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  const refresh = useCallback(() => setNow(Date.now()), [])
  return [now, refresh]
}

/**
 * A confirm that belongs to the state of the game on which it opened. It
 * shows while the game keeps that revision. A tap on any device closes it for
 * good, because revisions only grow, and the server would drop its tap.
 */
export function useConfirm<T>(
  revision: number,
): [T | null, (value: T | null) => void] {
  return useKeyed<T>(revision)
}

/**
 * A tap that a screen draws before the server answers it. It shows until the
 * next state of the game arrives, also when the server refuses the tap or a
 * lost connection drops it. `received` is the game of the latest state
 * message, and each message gives a new object.
 */
export function usePending<T>(
  received: Game,
): [T | null, (value: T | null) => void] {
  return useKeyed<T>(received)
}

/** A value that shows while its key stays the same. A new key drops it. */
function useKeyed<T>(key: unknown): [T | null, (value: T | null) => void] {
  const [held, setHeld] = useState<{ key: unknown; value: T } | null>(null)
  const set = useCallback(
    (value: T | null) => setHeld(value === null ? null : { key, value }),
    [key],
  )
  return [held !== null && held.key === key ? held.value : null, set]
}

/** Keeps the screen on. The browser drops the lock when the tab hides. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let stopped = false
    const request = () => {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (stopped) void sentinel.release()
          else lock = sentinel
        })
        // The screen may still sleep; the game itself keeps its time.
        .catch(() => undefined)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') request()
    }
    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [enabled])
}

/** The rendered height of an element, kept current as it resizes. */
export function useHeight<T extends HTMLElement>(): [
  number | null,
  RefCallback<T>,
] {
  const [height, setHeight] = useState<number | null>(null)
  const ref = useCallback((el: T | null) => {
    if (!el) return
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [height, ref]
}

export function isOver(timer: TimerView | null): boolean {
  return (
    timer !== null && timer.limitMs !== null && timer.elapsedMs > timer.limitMs
  )
}

/** Sounds the alarm once when a limit passes, also for a reaction window. */
export function useAlarm(timer: TimerView | null, settings: Settings) {
  const fired = useRef<string | null>(null)
  const [silenced, setSilenced] = useState<string | null>(null)
  const over = isOver(timer)
  const key = timer?.key ?? null
  useEffect(() => {
    if (!over || key === null || fired.current === key) return
    fired.current = key
    if (settings.alarmOn) playAlarm(settings.alarmSound)
  }, [over, key, settings.alarmOn, settings.alarmSound])
  return {
    alarming: over && key !== silenced,
    silence: () => setSilenced(key),
  }
}
