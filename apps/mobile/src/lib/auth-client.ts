import api, { API_URL } from "./api";
import { useAuthStore } from "../auth/auth-store";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { aiChallengeService } from "../services/ai-challenge.service";
import {
  hasLocalBotProgressToSync,
  getLocalBotProgressSnapshot,
  applyServerProgression,
  clearLocalBotProgress,
} from "./game/bot-progression";

class AuthClient {
  /**
   * If the player won any games locally before registering/logging in,
   * push that progress to the server so it isn't lost.
   */
  private async syncLocalAiProgressIfNeeded(): Promise<void> {
    try {
      const hasProgress = await hasLocalBotProgressToSync();
      if (!hasProgress) return;
      const { completedLevels, maxUnlockedAiLevel } = await getLocalBotProgressSnapshot();
      const progression = await aiChallengeService.syncLocalProgress(completedLevels, maxUnlockedAiLevel);
      await applyServerProgression(progression);
    } catch {
      // Non-fatal — local state is still intact for next session
    }
  }

  /**
   * Initialize the session.
   * Mirrors the web's AuthInitializer logic - syncs state from storage/backend.
   */
  async init() {
    const state = useAuthStore.getState();
    
    // Optimistically trust local session if it exists
    if (!state.user) {
      state.setStatus("unauthenticated");
      return null;
    }

    try {
      console.log("[AuthClient] Syncing session with backend...");
      const response = await api.get("/auth/me");
      state.setUser(response.data); // sync/refresh user data
      return response.data;
    } catch (error: any) {
      console.log("[AuthClient] Sync failed:", error.message);
      
      // ONLY clear session if server explicitly returns 401 Unauthorized
      if (error.response?.status === 401) {
        console.log("[AuthClient] Session invalid (401), clearing session.");
        state.logout();
        await SecureStore.deleteItemAsync("refreshToken");
      } else {
        // For 500, network errors, timeouts, etc.
        // We keep the authenticated status and trust the local state
        console.log("[AuthClient] Transient error, sticking with local session.");
      }
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
      this.syncLocalAiProgressIfNeeded();
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
      this.syncLocalAiProgressIfNeeded();
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

  async loginWithGoogle() {
    useAuthStore.getState().setStatus("transitioning");

    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_URL}/auth/google/mobile`,
        "tzdraft-mobile://auth/callback",
      );

      if (result.type !== "success") {
        // User cancelled or browser closed without completing auth.
        useAuthStore.getState().setStatus("unauthenticated");
        return null;
      }

      // Parse tokens from the deep-link URL.
      const url = new URL(result.url);
      const error = url.searchParams.get("error");
      if (error) {
        useAuthStore.getState().setStatus("unauthenticated");
        throw new Error(`Google sign-in failed: ${error}`);
      }

      const accessToken = url.searchParams.get("accessToken");
      const refreshToken = url.searchParams.get("refreshToken");
      if (!accessToken) {
        useAuthStore.getState().setStatus("unauthenticated");
        throw new Error("Google sign-in did not return a token.");
      }

      // Fetch user profile with the new token.
      const profileRes = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = profileRes.data;

      useAuthStore.getState().setToken(accessToken);
      useAuthStore.getState().setUser(user);
      if (refreshToken) {
        await SecureStore.setItemAsync("refreshToken", refreshToken);
      }
      useAuthStore.getState().setStatus("authenticated");
      this.syncLocalAiProgressIfNeeded();
      return { accessToken, user };
    } catch (error) {
      useAuthStore.getState().setStatus("unauthenticated");
      throw error;
    }
  }

  async updateProfile(details: any) {
    try {
      const response = await api.patch("/auth/profile", details);
      if (response.data.success) {
        useAuthStore.getState().setUser(response.data.data);
      }
      return response.data;
    } catch (error) {
      console.error("[AuthClient] Profile update failed:", error);
      throw error;
    }
  }

  async logout() {
    const store = useAuthStore.getState();
    const refreshToken = await SecureStore.getItemAsync("refreshToken");

    // Clear the in-memory token BEFORE the API call.
    // If the access token is already expired, the request interceptor would attach
    // it as an Authorization header, the server returns 401, and the refresh token
    // is never invalidated server-side — leaking the session until natural expiry.
    // With token = null, the interceptor attaches nothing, so the server evaluates
    // the request by the refresh token in the body alone, as intended.
    store.logout();

    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (error) {
      console.error("[AuthClient] Logout failed on server:", error);
    } finally {
      await SecureStore.deleteItemAsync("refreshToken");
      await clearLocalBotProgress();
    }
  }
}

export const authClient = new AuthClient();
