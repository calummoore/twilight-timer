import { BUILD } from '../build'
import {
  checkBuild,
  type BuildCheck,
  type GuardStore,
} from '../model/connection'

/**
 * The reload guard in `sessionStorage`, which survives a reload of the tab.
 * When the browser blocks it, the guard keeps nothing, and the page stops
 * instead of a reload.
 */
const GUARD: GuardStore = {
  getItem: (key) => tryOr(() => sessionStorage.getItem(key), null),
  setItem: (key, value) =>
    tryOr(() => sessionStorage.setItem(key, value), undefined),
  removeItem: (key) => tryOr(() => sessionStorage.removeItem(key), undefined),
}

/**
 * Compares the build that the server names, or null when it names none, with
 * the build of the page. A page of another build reloads once for each build
 * of the server, and the caller stops its work. On a second mismatch for the
 * same build, the caller shows the notice instead.
 */
export function checkServerBuild(server: string | null): BuildCheck {
  const check = checkBuild(GUARD, BUILD, server)
  if (check === 'reload') location.reload()
  return check
}

function tryOr<T>(run: () => T, fallback: T): T {
  try {
    return run()
  } catch {
    return fallback
  }
}
