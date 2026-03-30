import axios from "axios";
import { useAuthStore } from "./auth/auth-store";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // withCredentials sends the httpOnly accessToken/refreshToken cookies on every request
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor — handle token refresh transparently
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // refreshToken cookie is sent automatically via withCredentials.
        // The server rotates both tokens and sets fresh httpOnly cookies.
        await axiosInstance.post("/auth/refresh", {});

        // Retry the original request — the new accessToken cookie is now set
        return axiosInstance(originalRequest);
      } catch {
        // Refresh failed — session expired or cookie missing
        useAuthStore.getState().clearAuth();

        const pathParts = window.location.pathname.split("/");
        const currentLocale = ["sw", "en"].includes(pathParts[1])
          ? pathParts[1]
          : "sw";

        window.location.href = `/${currentLocale}/auth/login`;
        return Promise.reject(error);
      }
    }

    // Don't intercept login/register 401s
    if (
      error.response?.status === 401 &&
      (originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register"))
    ) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
