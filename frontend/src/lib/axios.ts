import axios from "axios";
import { useAuthStore } from "./auth/auth-store";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add access token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - Handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken },
        );

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Clear both localStorage tokens and the Zustand auth store so the
        // navbar reflects the signed-out state before redirecting.
        useAuthStore.getState().clearAuth();

        const pathParts = window.location.pathname.split("/");
        const currentLocale = ["sw", "en"].includes(pathParts[1])
          ? pathParts[1]
          : "sw";

        window.location.href = `/${currentLocale}/auth/login`;
        return Promise.reject(refreshError);
      }
    }

    // Special case for login/register failures - don't try to refresh/redirect
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
