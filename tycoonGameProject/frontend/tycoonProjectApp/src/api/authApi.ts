import type { Credentials, TokenPair } from "../types/api";
import { apiClient } from "./client";

export const authApi = {
  async login(credentials: Credentials): Promise<TokenPair> {
    const { data } = await apiClient.post<TokenPair>("/auth/login/", credentials);
    return data;
  },
  async register(credentials: Credentials): Promise<void> {
    await apiClient.post("/auth/register/", credentials);
  },
};