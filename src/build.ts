/**
 * The id of this build. `vite.config.ts` puts it into the page and into the
 * Worker, so both carry the same id. The model never reads it: the page and
 * the Worker pass it in, as they pass the clock.
 */
declare const __BUILD__: string

export const BUILD: string = __BUILD__
