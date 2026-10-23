import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const WIDTH = 1194
const HEIGHT = 834

/** Draws the app at iPad size and scales it to fit the window. */
export function Stage({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const box = viewport.current
    if (!box) return
    // Measure the box that centres the stage, not the window.
    const fit = () => {
      const { width, height } = box.getBoundingClientRect()
      setScale(Math.min(width / WIDTH, height / HEIGHT))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={viewport} className="viewport app-root">
      <div
        className="stage-wrap"
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
      >
        <div className="stage" style={{ transform: `scale(${scale})` }}>
          <div className="space" />
          {children}
        </div>
      </div>
    </div>
  )
}
