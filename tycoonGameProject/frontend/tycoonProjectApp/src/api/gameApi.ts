import type { BuyPayload, GameState } from "../types/api";
import { apiClient } from "./client";

export const gameApi = {
  async getState(): Promise<GameState> {
    const { data } = await apiClient.get<GameState>("/player/state/");
    return data;
  },
  async buy(payload: BuyPayload): Promise<GameState> {
    const { data } = await apiClient.post<GameState>("/player/buy/", payload);
    return data;
  },
  async buyUpgrade(slug: string): Promise<GameState> {
    const { data } = await apiClient.post<GameState>("/player/upgrade/", { upgrade: slug });
    return data;
  },
};