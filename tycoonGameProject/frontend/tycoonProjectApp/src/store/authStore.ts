import { create } from "zustand";
import { authApi } from "../api/authApi";
import { setSessionExpiredHandler } from "../api/client";
import { tokens } from "../api/tokens";
import type { Credentials } from "../types/api";
import { useGameStore } from "./gameStore";

interface AuthStore {
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: tokens.getAccess() !== null,

  login: async (credentials) => {
    const pair = await authApi.login(credentials);
    tokens.set(pair.access, pair.refresh);
    set({ isAuthenticated: true });
  },

  register: async (credentials) => {
    await authApi.register(credentials);
    await get().login(credentials);
  },

  logout: () => {
    tokens.clear();
    useGameStore.getState().reset();
    set({ isAuthenticated: false });
  },
}));

setSessionExpiredHandler(() => useAuthStore.getState().logout());