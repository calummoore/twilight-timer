import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { isFields } from '../model/parse-fields'
import { parseRoute, routePath, type Route } from '../model/routes'

/**
 * The state that the app keeps on each entry of the browser history: the
 * address of the entry under this one, when the app opened this entry on top
 * of it.
 */
interface EntryState {
  from: string | null
}

function fromOf(state: unknown): string | null {
  return isFields(state) && typeof state.from === 'string' ? state.from : null
}

function entry(from: string | null): EntryState {
  return { from }
}

export interface Router {
  route: Route
  /** Opens a route as a new history entry, so that Back returns here. */
  open: (route: Route) => void
  /** Shows a route in place of this entry, so that Back skips this one. */
  replace: (route: Route) => void
  /**
   * Returns to a route. When the entry under this one has the route, this is
   * Back, so that the history keeps no copy of it. Otherwise the route
   * replaces this entry.
   */
  back: (route: Route) => void
}

/**
 * The route of the address, in step with the browser history. `start` reads
 * the first route from the address. `revisit` says that the browser returns
 * to an entry that the app already had, after a reload or with Back.
 */
export function useRoute(
  start: (pathname: string, revisit: boolean) => Route,
): Router {
  const [route, setRoute] = useState(() =>
    start(location.pathname, history.state !== null),
  )
  const [first] = useState(route)

  // The address shows the first route, and the entry gets the state of the
  // app. This runs before the effects that can move to another route.
  useLayoutEffect(() => {
    history.replaceState(entry(fromOf(history.state)), '', routePath(first))
  }, [first])

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const open = useCallback((next: Route) => {
    history.pushState(entry(location.pathname), '', routePath(next))
    setRoute(next)
  }, [])
  const replace = useCallback((next: Route) => {
    history.replaceState(entry(fromOf(history.state)), '', routePath(next))
    setRoute(next)
  }, [])
  const back = useCallback(
    (to: Route) => {
      if (fromOf(history.state) !== routePath(to)) return replace(to)
      // The screen changes at once, so a second tap cannot go Back twice.
      setRoute(to)
      history.back()
    },
    [replace],
  )

  return { route, open, replace, back }
}
