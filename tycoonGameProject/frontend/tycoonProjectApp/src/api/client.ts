import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { TokenRefreshResponse } from "../types/api";
import { toApiError } from "./errors";
import { tokens } from "./tokens";

const BASE_URL = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

let onSessionExpired: () => void = () => {};
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

apiClient.interceptors.request.use((config) => {
  const token = tokens.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokens.getRefresh();
  if (!refresh) throw new Error("No refresh token");
  const { data } = await axios.post<TokenRefreshResponse>(`${BASE_URL}/auth/refresh/`, { refresh });
  tokens.set(data.access, data.refresh);
  return data.access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthCall = original?.url?.startsWith("/auth/") ?? false;

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing ??= refreshAccessToken().finally(() => {
          refreshing = null;
        });
        const access = await refreshing;
        original.headers.Authorization = `Bearer ${access}`;
        return apiClient(original);
      } catch {
        tokens.clear();
        onSessionExpired();
      }
    }
    return Promise.reject(toApiError(error));
  },
);