import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

// Custom storage for SecureStore compatibility with Zustand
const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export type AuthStatus = "loading" | "unauthenticated" | "guest" | "authenticated" | "transitioning";

interface User {
  id: string;
  phoneNumber?: string;
  email?: string;
  username?: string;
  displayName?: string;
  image?: string;
  avatarUrl?: string;
  accountType?: "GUEST" | "REGISTERED" | "OAUTH_PENDING";
  rating?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setHasHydrated: (state: boolean) => void;
  setStatus: (status: AuthStatus) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      status: "loading",
      isAuthenticated: false,
      hasHydrated: false,
      setUser: (user) => set((state) => {
        let status: AuthStatus = "unauthenticated";

        if (user) {
          status = user.accountType === "GUEST" ? "guest" : "authenticated";
        }

        const normalizedUser = user ? { ...user, rating: user.rating ?? 1200 } : null;

        return {
          user: normalizedUser,
          isAuthenticated: !!user,
          status: state.status === "transitioning" ? "transitioning" : status
        };
      }),
      setToken: (token) => set({ token }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
      setStatus: (status) => set({ status }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, status: "unauthenticated" });
      },
    }),
    {
      name: "tzdraft-auth-storage",
      storage: createJSONStorage(() => secureStorage),
      // Guest sessions are ephemeral — never write them to SecureStore.
      // Only persist registered/OAuth users so they skip the welcome page on reopen.
      partialize: (state) => {
        if (!state.user || state.user.accountType === "GUEST") {
          return { user: null, token: null };
        }
        return { user: state.user, token: state.token };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
          // Guard against stale guest data that may already be in storage.
          if (state.user && state.user.accountType !== "GUEST") {
            state.isAuthenticated = true;
            state.status = "authenticated";
          } else {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.status = "unauthenticated";
          }
        }
      },
    }
  )
);
