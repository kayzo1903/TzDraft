import api from "./api";
import { useAuthStore } from "../auth/auth-store";
import * as SecureStore from "expo-secure-store";

class AuthClient {
  /**
   * Initialize the session.
   * Mirrors the web's AuthInitializer logic - syncs state from storage/backend.
   */
  async init() {
    try {
      const user = await api.get("/auth/me");
      useAuthStore.getState().setUser(user.data);
      return user.data;
    } catch (error) {
      console.log("[AuthClient] Init failed:", error);
      useAuthStore.getState().setStatus("unauthenticated");
      return null;
    }
  }

  async login(credentials: any) {
    useAuthStore.getState().setStatus("transitioning");
    try {
      const response = await api.post("/auth/login", credentials);
      const { accessToken, refreshToken, user } = response.data;

      // Save tokens and user
      useAuthStore.getState().setToken(accessToken);
      useAuthStore.getState().setUser(user);
      if (refreshToken) {
        await SecureStore.setItemAsync("refreshToken", refreshToken);
      }
      
      // Update status to authenticated
      useAuthStore.getState().setStatus("authenticated");
      return response.data;
    } catch (error) {
      useAuthStore.getState().setStatus("unauthenticated");
      throw error;
    }
  }

  async register(details: any) {
    useAuthStore.getState().setStatus("transitioning");
    try {
      const response = await api.post("/auth/register", details);
      const { accessToken, refreshToken, user } = response.data;

      useAuthStore.getState().setToken(accessToken);
      useAuthStore.getState().setUser(user);
      if (refreshToken) {
        await SecureStore.setItemAsync("refreshToken", refreshToken);
      }

      useAuthStore.getState().setStatus("authenticated");
      return response.data;
    } catch (error) {
      useAuthStore.getState().setStatus("unauthenticated");
      throw error;
    }
  }

  async sendOTP(phoneNumber: string, purpose: string) {
    return api.post("/auth/send-otp", { phoneNumber, purpose });
  }

  async verifyOTP(phoneNumber: string, code: string, purpose: string) {
    return api.post("/auth/verify-otp", { phoneNumber, code, purpose });
  }
  
  async loginAsGuest() {
    useAuthStore.getState().setStatus("transitioning");
    try {
      const response = await api.post("/auth/guest");
      const { accessToken, refreshToken, user } = response.data;

      // Save tokens and user
      useAuthStore.getState().setToken(accessToken);
      useAuthStore.getState().setUser(user);
      if (refreshToken) {
        await SecureStore.setItemAsync("refreshToken", refreshToken);
      }

      useAuthStore.getState().setStatus("guest");
      return response.data;
    } catch (error) {
      useAuthStore.getState().setStatus("unauthenticated");
      throw error;
    }
  }

  async logout() {
    try {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      await api.post("/auth/logout", { refreshToken });
    } catch (error) {
      console.error("[AuthClient] Logout failed on server:", error);
    } finally {
      useAuthStore.getState().logout();
      await SecureStore.deleteItemAsync("refreshToken");
    }
  }
}

export const authClient = new AuthClient();
