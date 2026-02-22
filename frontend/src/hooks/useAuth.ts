"use client";

import { useAuthStore } from "@/lib/auth/auth-store";
import { authClient } from "@/lib/auth/auth-client";

export function useAuth() {
  const { user, isAuthenticated, clearAuth, updateUser } = useAuthStore();

  return {
    user,
    isAuthenticated,
    login: authClient.login,
    register: authClient.register,
    logout: async () => {
      await authClient.logout();
      clearAuth();
    },
    updateUser,
  };
}
