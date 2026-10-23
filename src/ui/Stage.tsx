import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const WIDTH = 1194
const HEIGHT = 834

/** Draws the app at iPad size and scales it to fit the window's safe area. */
export function Stage({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const element = viewport.current
    if (!element) return
    const fit = () => {
      const { width, height } = element.getBoundingClientRect()
      setScale(Math.min(width / WIDTH, height / HEIGHT))
    }
    fit()
    // Watches the box itself, so a safe-area change refits the stage too.
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <div className="viewport app-root" ref={viewport}>
      <div
        className="stage"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <div className="space" />
        {children}
      </div>
    </div>
  )
}
