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

function isAuthRoute(url?: string): boolean {
  if (!url) return false;
  return url.includes("/auth/");
}

function isAuthPage(pathname: string): boolean {
  return /^\/(?:sw|en)\/auth(?:\/|$)/.test(pathname);
}

// Response interceptor — handle token refresh transparently
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url as string | undefined;

    // Auth endpoints should surface their own errors directly.
    // Otherwise a failed login/refresh can recurse into the refresh flow
    // and reload the current auth page.
    if (error.response?.status === 401 && isAuthRoute(requestUrl)) {
      return Promise.reject(error);
    }

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

        if (!isAuthPage(window.location.pathname)) {
          window.location.href = `/${currentLocale}/auth/login`;
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
