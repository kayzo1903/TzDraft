import { useAuthStore } from "../auth/auth-store";
import { isNetworkError } from "../utils/network-gate";

/**
 * Hook for actions that require an authenticated session.
 *
 * Usage:
 *   const { gatedAction, isGuest } = useNetworkGate();
 *
 *   // Blocks guests; swallows offline errors for registered users
 *   await gatedAction(
 *     () => studyService.saveStudy(...),
 *     () => setShowLoginModal(true),  // optional: what to do when blocked
 *   );
 */
export function useNetworkGate() {
  const status = useAuthStore((s) => s.status);
  const isGuest = status === "guest" || status === "unauthenticated";

  /**
   * Run `fn` only if the user is authenticated.
   *
   * - Guest / unauthenticated → calls `onBlocked` (if provided) and returns.
   * - Authenticated + offline  → swallows the network error silently.
   * - Authenticated + server error → re-throws so the caller can handle it.
   */
  const gatedAction = async (
    fn: () => Promise<unknown>,
    onBlocked?: () => void,
  ): Promise<void> => {
    if (isGuest) {
      onBlocked?.();
      return;
    }
    try {
      await fn();
    } catch (e) {
      if (isNetworkError(e)) return; // offline — keep silent
      throw e;                        // server / auth error — let caller handle
    }
  };

  return { gatedAction, isGuest };
}
