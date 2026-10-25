/** The bindings that `wrangler.jsonc` gives the Worker. */
export interface Env {
  GameRoom: DurableObjectNamespace
  /** Limits code tries per address. Missing in a dev runtime without it. */
  JOIN_LIMIT?: RateLimit
  [binding: string]: unknown
}
