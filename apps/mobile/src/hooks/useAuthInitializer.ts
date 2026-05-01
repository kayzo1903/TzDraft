import { useEffect, useRef } from "react";
import { authClient } from "../lib/auth-client";
import { useAuthStore } from "../auth/auth-store";

/**
 * Hook to restore auth state from secure storage and sync with backend on app launch.
 * Mirrors the web's AuthInitializer component.
 */
export function useAuthInitializer() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const ran = useRef(false);

  useEffect(() => {
    // Wait for zustand persist to rehydrate from SecureStore, then run once
    if (!hasHydrated || ran.current) return;
    ran.current = true;

    if (isAuthenticated) {
      if (__DEV__) console.log("[AuthInitializer] Syncing session with backend...");
      authClient.init();
    } else {
      if (__DEV__) console.log("[AuthInitializer] No active session found.");
    }
  }, [hasHydrated, isAuthenticated]);

  return { hasHydrated };
}
