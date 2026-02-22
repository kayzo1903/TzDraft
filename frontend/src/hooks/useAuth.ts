"use client";

import { useAuthStore } from "@/lib/auth/auth-store";
import { authClient } from "@/lib/auth/auth-client";

export function useAuth() {
  const { user, isAuthenticated, isHydrated, clearAuth, updateUser } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isHydrated,
    login: authClient.login,
    register: authClient.register,
    logout: async () => {
      await authClient.logout();
      clearAuth();
    },
    updateUser,
  };
}
