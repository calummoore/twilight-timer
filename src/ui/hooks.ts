import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
} from 'react'
import type { Settings } from '../model/settings'
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

/**
 * Sounds the alarm once when a limit passes. The reaction window closes
 * itself at its limit, so it does not alarm.
 */
export function useAlarm(timer: TimerView | null, settings: Settings) {
  const fired = useRef<string | null>(null)
  const [silenced, setSilenced] = useState<string | null>(null)
  const over = isOver(timer) && timer?.kind !== 'reaction'
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
