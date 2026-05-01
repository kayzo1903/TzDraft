import axios from "axios";
import { useAuthStore } from "../auth/auth-store";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// On physical devices, 'localhost' won't work for the dev server.
// We dynamically detect the host IP from Expo's constants.
const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost?.split(":")[0];

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (localhost ? `http://${localhost}:3002` : "http://192.168.1.199:3002");

if (__DEV__) console.log(`[API] Base URL: ${API_URL} (hostUri=${debuggerHost ?? "undefined"})`);


export { API_URL };;

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Slightly increased for mobile network stability
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple refresh attempts simultaneously
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  async (config) => {
    // DEV: Simulate offline mode
    if (__DEV__ && process.env.EXPO_PUBLIC_SIMULATE_OFFLINE === "true") {
      console.log("[API] Simulating offline mode (EXPO_PUBLIC_SIMULATE_OFFLINE=true)");
      throw new Error("Network request failed");
    }

    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // DEV: Mock 401 for /auth/me to test rehydration resilience
    if (
      __DEV__ &&
      process.env.EXPO_PUBLIC_MOCK_AUTH_ME_401 === "true" &&
      response.config.url?.includes("/auth/me")
    ) {
      console.log("[API] Mocking 401 Unauthorized for /auth/me");
      return Promise.reject({
        response: { status: 401, data: { message: "Mocked Unauthorized" } },
        config: response.config
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized and only retry once
    const authUrls = ["/auth/login", "/auth/register", "/auth/logout", "/auth/refresh", "/auth/guest"];
    const isAuthRequest = authUrls.some(url => originalRequest.url?.includes(url));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken");
        if (!refreshToken) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        // Use the refresh token to get a new access token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Save new tokens
        useAuthStore.getState().setToken(accessToken);
        if (newRefreshToken) {
          await SecureStore.setItemAsync("refreshToken", newRefreshToken);
        }

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error("[API] Token refresh failed:", refreshError);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
