/**
 * Network-gate utilities.
 *
 * Two patterns for handling network-dependent actions gracefully:
 *
 * - silentNetwork(fn)  — fire-and-forget; swallows all errors silently.
 *   Use for background syncs (e.g. AI progression) where the user should
 *   never see an error regardless of connectivity.
 *
 * - isNetworkError(e)  — true when the request never reached the server
 *   (timeout, no connection, DNS failure).  Use to distinguish "offline"
 *   from "server rejected the request" so callers can decide whether to
 *   surface an error to the user.
 */

/** Fire-and-forget wrapper — all errors are swallowed silently. */
export function silentNetwork(fn: () => Promise<unknown>): void {
  fn().catch(() => {});
}

/**
 * Returns true for Axios network errors (request never reached the server).
 * Returns false for server responses (4xx, 5xx) — those still need to
 * surface to the user.
 */
export function isNetworkError(e: unknown): boolean {
  const err = e as any;
  return !!(err?.isAxiosError && !err?.response);
}
