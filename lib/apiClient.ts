// lib/apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// In-memory access token storage
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Ensures HTTP-only cookies (e.g., refreshToken) are sent
});

// Queue state management to handle simultaneous requests during rotation
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

// 1. Request Interceptor: Attach Access Token to Headers
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Catch 401 & Trigger Automatic Token Refresh / Rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Ignore non-401 errors, unhandled responses, or auth endpoint failures
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest.url?.includes("/api/auth/refresh") ||
      originalRequest.url?.includes("/api/auth/login")
    ) {
      return Promise.reject(error);
    }

    // Prevent infinite retry loops if request already retried once
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // If another request is currently refreshing the token, queue this one
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
            }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Call refresh endpoint with credentials (HTTP-only cookie sent automatically)
      const { data } = await axios.post(
        "/api/auth/refresh",
        {},
        { withCredentials: true }
      );

      const newAccessToken = data.accessToken;
      setAccessToken(newAccessToken);

      // Resolve all pending requests in the queue with the new access token
      processQueue(null, newAccessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      // Retry original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Clear token and reject queue on refresh failure (e.g., token expired or revoked)
      processQueue(refreshError, null);
      setAccessToken(null);

      // Redirect user to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login?expired=true";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;