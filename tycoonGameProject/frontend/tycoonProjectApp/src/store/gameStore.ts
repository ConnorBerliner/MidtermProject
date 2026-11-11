import { create } from "zustand";
import { gameApi } from "../api/gameApi";
import { toApiError } from "../api/errors";
import { incomeRate, nodeCost } from "../lib/math";
import { notifyError } from "../lib/notify";
import type { AchievementDTO, GameState, NodeDTO } from "../types/api";

const CACHE_KEY = "tycoon.cache";
const OFFLINE_TIME_SEC_CAP = 8 * 3600;

interface Cache {
  currency: number;
  nodes: NodeDTO[];
  savedAt: number;
}

function isCache(value: unknown): value is Cache {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.currency === "number" && Array.isArray(c.nodes) && typeof c.savedAt === "number"
  );
}

interface GameStore {
  currency: number;
  nodes: NodeDTO[];
  achievements: AchievementDTO[];
  ready: boolean;
  applyServer: (state: GameState) => void;
  loadCache: () => void;
  saveCache: () => void;
  tick: (dtSeconds: number) => void;
  boot: () => Promise<number>;
  sync: () => Promise<void>;
  buy: (slug: string, qty: number) => Promise<void>;
  reset: () => void;
}

const INITIAL = { 
    currency: 0, 
    nodes: [], 
    achievements: [], 
    ready: false 
};

let bootPromise: Promise<number> | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL,

  applyServer: (state) => {
    set({
      currency: state.currency,
      nodes: state.nodes,
      achievements: state.achievements,
      ready: true,
    });
    get().saveCache();
  },

  loadCache: () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isCache(parsed)) return;
      const elapsed = Math.min((Date.now() - parsed.savedAt) / 1000, OFFLINE_TIME_SEC_CAP);
      set({
        nodes: parsed.nodes,
        currency: parsed.currency + incomeRate(parsed.nodes) * elapsed,
        ready: true,
      });
    } catch {
      localStorage.removeItem(CACHE_KEY);
    }
  },

  saveCache: () => {
    const { ready, currency, nodes } = get();
    if (!ready) return; 
    const cache: Cache = { currency, nodes, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  },

  tick: (dtSeconds) => {
    const rate = incomeRate(get().nodes);
    if (rate > 0) set((s) => ({ currency: s.currency + rate * dtSeconds }));
  },

  boot: () => {
    bootPromise ??= (async () => {
      get().loadCache();
      try {
        const state = await gameApi.getState(); 
        get().applyServer(state);
        return state.offline_earned;
      } catch (err) {
        notifyError(err);
        return 0;
      }
    })();
    return bootPromise;
  },

  sync: async () => {
    try {
      get().applyServer(await gameApi.getState());
    } catch (err) {
      if (toApiError(err).status !== 0) notifyError(err);
    }
  },

  buy: async (slug, qty) => {
    const { nodes, currency } = get();
    const node = nodes.find((n) => n.slug === slug);
    if (!node) return;
    const cost = nodeCost(node, qty);
    if (currency < cost) return;


    set({
      currency: currency - cost,
      nodes: nodes.map((n) => (n.slug === slug ? { ...n, level: n.level + qty } : n)),
    });

    try {
      get().applyServer(await gameApi.buy({ node: slug, qty }));
    } catch (err) {
      notifyError(err);
      await get().sync(); 
    }
  },

  reset: () => {
    bootPromise = null;
    localStorage.removeItem(CACHE_KEY);
    set({ ...INITIAL });
  },
}));