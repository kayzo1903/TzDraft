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
  email?: string;
  username?: string;
  displayName?: string;
  image?: string;
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
        return { 
          user, 
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
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
          // Derive status and auth from rehydrated state
          if (state.user) {
            state.isAuthenticated = true;
            state.status = state.user.accountType === "GUEST" ? "guest" : "authenticated";
          } else {
            state.isAuthenticated = false;
            state.status = "unauthenticated";
          }
        }
      },
    }
  )
);
