import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthState, User } from "./types";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,

      // Tokens are stored exclusively in httpOnly cookies set by the backend.
      // Never stored in localStorage or JS-accessible state.
      setAuth: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updateUser: (updates: Partial<User>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),
    }),
    {
      name: "auth-storage",
      // Only persist non-sensitive UI state — tokens live in httpOnly cookies only
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
