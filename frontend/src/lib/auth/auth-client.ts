import axiosInstance, { refreshAccessToken } from "../axios";
import { useAuthStore } from "./auth-store";
import { RegisterData, LoginData } from "./types";
import { hasLocalBotProgressToSync, getLocalBotProgressSnapshot } from "../game/bot-progression";
import { aiChallengeService } from "@/services/ai-challenge.service";

export type OtpPurpose = "signup" | "password_reset" | "verify_phone";

async function syncLocalAiProgressIfNeeded(accountType: string): Promise<void> {
  if (accountType !== "REGISTERED") return;
  if (!hasLocalBotProgressToSync()) return;

  try {
    const snapshot = getLocalBotProgressSnapshot();
    await aiChallengeService.syncLocalProgress(snapshot);
  } catch (error) {
    console.warn("Failed to sync local AI progression after authentication.", error);
  }
}

export const authClient = {
  /**
   * Restore auth state from httpOnly cookie.
   * Call this on app mount to rehydrate the user after a page refresh.
   * The accessToken cookie is sent automatically by the browser.
   */
  async init(): Promise<void> {
    try {
      const response = await axiosInstance.get("/auth/me");
      useAuthStore.getState().setAuth(response.data);
      return;
    } catch {
      try {
        await refreshAccessToken();
        const response = await axiosInstance.get("/auth/me");
        useAuthStore.getState().setAuth(response.data);
        return;
      } catch {
        // Cookie missing or expired — user is not logged in
        useAuthStore.getState().clearAuth();
      }
    }
  },

  async register(data: RegisterData): Promise<{ user: any }> {
    const response = await axiosInstance.post("/auth/register", data);
    const { user } = response.data;
    useAuthStore.getState().setAuth(user);
    await syncLocalAiProgressIfNeeded(user.accountType);
    return response.data;
  },

  async login(data: LoginData): Promise<{ user: any }> {
    const response = await axiosInstance.post("/auth/login", data);
    const { user } = response.data;
    useAuthStore.getState().setAuth(user);
    await syncLocalAiProgressIfNeeded(user.accountType);
    return response.data;
  },

  async sendOTP(
    phoneNumber: string,
    purpose: OtpPurpose = "signup",
  ): Promise<{ success: boolean; message: string }> {
    const response = await axiosInstance.post("/auth/send-otp", {
      phoneNumber,
      purpose,
    });
    return response.data;
  },

  async verifyOTP(
    phoneNumber: string,
    code: string,
    purpose: OtpPurpose = "signup",
  ): Promise<{ success: boolean; message: string }> {
    const response = await axiosInstance.post("/auth/verify-otp", {
      phoneNumber,
      code,
      purpose,
    });
    return response.data;
  },

  async createGuest(): Promise<{ user: any }> {
    // Reuse existing guest session if still authenticated
    const state = useAuthStore.getState();
    if (
      state.isAuthenticated &&
      (state.user?.accountType === "GUEST" ||
        state.user?.phoneNumber?.startsWith("GUEST_"))
    ) {
      return { user: state.user! };
    }
    const response = await axiosInstance.post("/auth/guest");
    const { user } = response.data;
    useAuthStore.getState().setAuth(user);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      // refreshToken is in the httpOnly cookie — sent automatically
      await axiosInstance.post("/auth/logout", {});
    } catch {
      // ignore server errors on logout
    }
    useAuthStore.getState().clearAuth();
  },

  async getCurrentUser() {
    const response = await axiosInstance.get("/auth/me", {
      headers: { "Cache-Control": "no-cache" },
    });
    return response.data;
  },

  async verifyEmail(token: string) {
    const response = await axiosInstance.post("/auth/verify-email", { token });
    return response.data;
  },

  async requestPasswordReset(email: string) {
    const response = await axiosInstance.post("/auth/forgot-password", {
      email,
    });
    return response.data;
  },

  async resetPassword(token: string, newPassword: string) {
    const response = await axiosInstance.post("/auth/reset-password", {
      token,
      newPassword,
    });
    return response.data;
  },

  async acceptTerms(): Promise<{ termsAcceptedAt: string }> {
    const response = await axiosInstance.patch('/auth/accept-terms');
    useAuthStore.getState().updateUser({ termsAcceptedAt: response.data.termsAcceptedAt });
    return response.data;
  },

  async resetPasswordPhone(
    phoneNumber: string,
    code: string,
    newPassword: string,
  ) {
    const response = await axiosInstance.post("/auth/reset-password-phone", {
      phoneNumber,
      code,
      newPassword,
    });
    return response.data;
  },

  async updateProfile(data: {
    displayName?: string;
    email?: string;
    country?: string;
    region?: string;
  }) {
    const response = await axiosInstance.patch("/auth/profile", data);
    if (response.data?.data) {
      useAuthStore.getState().updateUser(response.data.data);
    }
    return response.data;
  },
};
