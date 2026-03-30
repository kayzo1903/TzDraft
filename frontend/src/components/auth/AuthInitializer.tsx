"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useAuthStore } from "@/lib/auth/auth-store";

/**
 * Restores auth state from the httpOnly accessToken cookie on every page load.
 * Replaces the old localStorage-based token persistence pattern.
 *
 * Mount this once at the root layout. It calls GET /auth/me using the cookie
 * sent automatically by the browser, and updates the Zustand store with the
 * fresh user object. If the cookie is absent or expired it attempts a silent
 * refresh before giving up and clearing the auth state.
 */
export function AuthInitializer() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const ran = useRef(false);

  useEffect(() => {
    // Wait for zustand persist to rehydrate, then run once
    if (!hasHydrated || ran.current) return;
    ran.current = true;
    authClient.init();
  }, [hasHydrated]);

  return null;
}
