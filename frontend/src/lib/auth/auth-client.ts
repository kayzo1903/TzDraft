import axiosInstance from "../axios";
import { useAuthStore } from "./auth-store";
import { RegisterData, LoginData, AuthResponse } from "./types";

export type OtpPurpose = "signup" | "password_reset" | "verify_phone";

export const authClient = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      "/auth/register",
      data,
    );
    const { user, accessToken, refreshToken } = response.data;
    useAuthStore.getState().setAuth(user, accessToken, refreshToken);
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      "/auth/login",
      data,
    );
    const { user, accessToken, refreshToken } = response.data;
    useAuthStore.getState().setAuth(user, accessToken, refreshToken);
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

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      await axiosInstance.post("/auth/logout", { refreshToken });
    }
    useAuthStore.getState().clearAuth();
  },

  async getCurrentUser() {
    const response = await axiosInstance.get("/auth/me");
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
};
