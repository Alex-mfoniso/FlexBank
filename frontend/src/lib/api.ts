import axios from "axios";

// Centralized Backend URL resolver matching environmental definitions
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const playgroundApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Automatically inject session authorization tokens & workspace project headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const selectedProjectId = localStorage.getItem("selectedProjectId");
    if (selectedProjectId) {
      config.headers["x-project-id"] = selectedProjectId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

playgroundApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const selectedProjectId = localStorage.getItem("selectedProjectId");
    if (selectedProjectId) {
      config.headers["x-project-id"] = selectedProjectId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Unified Interface for standardized client errors
export interface ApiErrorPayload {
  code: string;
  message: string;
  requestId?: string;
  details?: any;
}

// Response Interceptor: Manage token expiries and standardize backend error responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Session Expiry auto-cleanup & redirect to login
    if (error.response?.status === 401) {
      const isAuthRoute = window.location.pathname === "/login" || window.location.pathname === "/signup";
      if (!isAuthRoute) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedProjectId");
        window.location.href = "/login?expired=true";
      }
    }

    // 2. Parse Standardized Backend Errors
    const backendData = error.response?.data;
    const errorPayload: ApiErrorPayload = {
      code: backendData?.error?.code || "CLIENT_ERROR",
      message: backendData?.error?.message || error.message || "An unexpected network error occurred.",
      requestId: backendData?.requestId,
      details: backendData?.error?.details,
    };

    // Human-friendly translations for standard technical operational codes (Section 6)
    if (errorPayload.code === "INSUFFICIENT_FUNDS") {
      errorPayload.message = "Insufficient available balance to complete this transfer operation.";
    } else if (errorPayload.code === "ACCOUNT_NOT_ACTIVE") {
      errorPayload.message = "This operation is forbidden because the financial account is frozen or closed.";
    } else if (errorPayload.code === "TRANSFER_LIMIT_EXCEEDED") {
      errorPayload.message = "Transfer amount exceeds the established single-transaction or daily limit.";
    }

    return Promise.reject(errorPayload);
  },
);

export default api;
