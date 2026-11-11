import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { toApiError } from "../api/errors";
import { gameApi } from "../api/gameApi";
import {
  NO_MULTIPLIERS,
  cycleLength,
  cyclePayout,
  incomeRate,
  isCycleNode,
  nodeCost,
} from "../lib/math";
import { notifyError } from "../lib/notify";
import type {
  AchievementDTO,
  GameState,
  Multipliers,
  NodeDTO,
  UpgradeDTO,
} from "../types/api";
import { loggedOut } from "./actions";
import type { AppThunk } from "./index";

const CACHE_KEY = "tycoon.cache";
const OFFLINE_CAP_SECONDS = 8 * 3600;

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

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCache(parsed) ? parsed : null;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export interface GameSliceState {
  currency: number;
  nodes: NodeDTO[];
  achievements: AchievementDTO[];
  upgrades: UpgradeDTO[];
  multipliers: Multipliers;
  cycleStarts: Record<string, number>; // slug -> when the current trip began (ms)
  ready: boolean;
}

const initialState: GameSliceState = {
  currency: 0,
  nodes: [],
  achievements: [],
  upgrades: [],
  multipliers: { ...NO_MULTIPLIERS },
  cycleStarts: {},
  ready: false,
};

const slice = createSlice({
  name: "game",
  initialState,
  reducers: {
    tick(state, action: PayloadAction<{ dt: number; now: number }>) {
      const { dt, now } = action.payload;
      const m = state.multipliers;
      const rate = incomeRate(state.nodes, m);
      if (rate > 0) state.currency += rate * dt;

      for (const node of state.nodes) {
        if (!isCycleNode(node) || node.level === 0) continue;
        const start = state.cycleStarts[node.slug];
        if (start === undefined) continue;
        const lengthMs = cycleLength(node, m) * 1000;
        const done = Math.floor((now - start) / lengthMs); // handles throttled background tabs
        if (done > 0) {
          state.currency += done * cyclePayout(node, node.level, m);
          state.cycleStarts[node.slug] = start + done * lengthMs;
        }
      }
    },
    serverApplied: {
      reducer(state, action: PayloadAction<GameState, string, { receivedAt: number }>) {
        const { payload, meta } = action;
        state.currency = payload.currency;
        state.nodes = payload.nodes;
        state.achievements = payload.achievements;
        // Fallbacks keep the page alive if the backend is an older version.
        state.upgrades = payload.upgrades ?? [];
        state.multipliers = payload.multipliers ?? { ...NO_MULTIPLIERS };
        state.cycleStarts = Object.fromEntries(
          payload.nodes
            .filter((n) => n.cycle_seconds > 0 && n.level > 0)
            .map((n) => [n.slug, meta.receivedAt - n.cycle_elapsed * 1000]),
        );
        state.ready = true;
      },
      prepare: (payload: GameState) => ({ payload, meta: { receivedAt: Date.now() } }),
    },
    cacheLoaded(state, action: PayloadAction<{ currency: number; nodes: NodeDTO[] }>) {
      state.currency = action.payload.currency;
      state.nodes = action.payload.nodes;
      state.ready = true;
    },
    optimisticBuy(
      state,
      action: PayloadAction<{ slug: string; qty: number; cost: number; now: number }>,
    ) {
      const { slug, qty, cost, now } = action.payload;
      state.currency -= cost;
      const node = state.nodes.find((n) => n.slug === slug);
      if (!node) return;
      if (node.cycle_seconds > 0 && node.level === 0) state.cycleStarts[slug] = now;
      node.level += qty;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loggedOut, () => initialState);
  },
});

export const { tick, serverApplied, cacheLoaded, optimisticBuy } = slice.actions;
export default slice.reducer;

// ---- cache helpers ----
function saveCache(state: GameSliceState): void {
  if (!state.ready) return; // never overwrite a good cache with empty state
  const cache: Cache = { currency: state.currency, nodes: state.nodes, savedAt: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function clearGameCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

let bootPromise: Promise<number> | null = null; // guards React StrictMode's double effect
export function resetBootGuard(): void {
  bootPromise = null;
}

// ---- thunks ----
export const persist = (): AppThunk => (_dispatch, getState) => {
  saveCache(getState().game);
};

export const boot = (): AppThunk<Promise<number>> => (dispatch, getState) => {
  bootPromise ??= (async () => {
    const cached = readCache();
    if (cached) {
      const elapsed = Math.min((Date.now() - cached.savedAt) / 1000, OFFLINE_CAP_SECONDS);
      dispatch(
        cacheLoaded({
          nodes: cached.nodes,
          currency: cached.currency + incomeRate(cached.nodes) * elapsed,
        }),
      );
    }
    try {
      const state = await gameApi.getState(); // server is authoritative
      dispatch(serverApplied(state));
      saveCache(getState().game);
      return state.offline_earned;
    } catch (err) {
      notifyError(err);
      return 0;
    }
  })();
  return bootPromise;
};

export const sync = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  try {
    dispatch(serverApplied(await gameApi.getState()));
    saveCache(getState().game);
  } catch (err) {
    if (toApiError(err).status !== 0) notifyError(err); // stay quiet while offline
  }
};

export const buy =
  (slug: string, qty: number): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const { nodes, currency, multipliers } = getState().game;
    const node = nodes.find((n) => n.slug === slug);
    if (!node) return;
    const cost = nodeCost(node, qty, multipliers.discount);
    if (currency < cost) return;

    dispatch(optimisticBuy({ slug, qty, cost, now: Date.now() }));
    try {
      dispatch(serverApplied(await gameApi.buy({ node: slug, qty })));
      saveCache(getState().game);
    } catch (err) {
      notifyError(err);
      await dispatch(sync()); // roll back to the server's truth
    }
  };

/** Not optimistic: upgrades change several multipliers, so we wait for the server's numbers. */
export const buyUpgrade =
  (slug: string): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    try {
      dispatch(serverApplied(await gameApi.buyUpgrade(slug)));
      saveCache(getState().game);
    } catch (err) {
      notifyError(err);
      await dispatch(sync());
    }
  };