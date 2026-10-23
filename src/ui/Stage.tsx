import { useLayoutEffect, useState, type ReactNode } from 'react'

const WIDTH = 1194
const HEIGHT = 834

/** Draws the app at iPad size and scales it to fit the window. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () =>
      setScale(Math.min(innerWidth / WIDTH, innerHeight / HEIGHT))
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])
  return (
    <div className="viewport app-root">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        <div className="space" />
        {children}
      </div>
    </div>
  )
}
