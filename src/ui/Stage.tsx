import type { ReactNode } from 'react'

/**
 * The app root. It fills the window and is a size container, so the screen
 * styles can arrange each screen for the space that the app has.
 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="viewport app-root">
      <div className="stage">
        <div className="space" />
        {children}
      </div>
    </div>
  )
}
