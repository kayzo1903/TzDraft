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

// Lazy load GoogleSignin to prevent crashes in Expo Go or older builds
const getGoogleSignin = () => {
  try {
    return require("@react-native-google-signin/google-signin").GoogleSignin;
  } catch (e) {
    return null;
  }
};

class AuthClient {
  constructor() {
    // Configuration handled lazily during sign-in to avoid early native module access
  }

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

    // Local-only guest — no token, nothing to sync with the backend
    if (!state.token) {
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
  
  /**
   * Enter guest mode entirely locally — no network call, no DB row.
   * The guest identity lives only in memory for this session; it is never
   * persisted to SecureStore (enforced by the store's partialize) so the
   * next app open starts from unauthenticated again.
   */
  loginAsLocalGuest() {
    const store = useAuthStore.getState();
    store.setUser({
      id: `guest-${Date.now()}`,
      displayName: "Guest",
      accountType: "GUEST",
    });
    // token stays null — axios interceptor attaches no Authorization header
    store.setStatus("guest");
  }

  async loginWithGoogle() {
    useAuthStore.getState().setStatus("transitioning");

    try {
      const GoogleSignin = getGoogleSignin();
      if (!GoogleSignin) {
        throw new Error(
          "Native Google Sign-In is not available. Please ensure you are using a development build (not Expo Go) and have built the app binary."
        );
      }
      
      // Configure on the fly (idempotent)
      // webClientId is required so Google issues an idToken (signed against the Web client).
      // androidClientId alone only produces a serverAuthCode, not an idToken.
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        offlineAccess: true,
      });

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error("No ID Token returned from Google Sign-In");
      }

      // Send the ID token to our new native-auth endpoint
      const response = await api.post("/auth/google/signin-native", { idToken });
      const { accessToken, refreshToken, user } = response.data;

      // Save tokens and user
      useAuthStore.getState().setToken(accessToken);
      useAuthStore.getState().setUser(user);
      if (refreshToken) {
        await SecureStore.setItemAsync("refreshToken", refreshToken);
      }
      
      useAuthStore.getState().setStatus("authenticated");
      this.syncLocalAiProgressIfNeeded();
      return { accessToken, user };
    } catch (error: any) {
      console.error("[AuthClient] Google Native Sign-In failed:", error);
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

    // Clear all in-memory caches that are user-specific so the next session
    // (same or different user) starts completely fresh.
    aiChallengeService.clearCache();

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
