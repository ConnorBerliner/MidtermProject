import type { Multipliers, NodeDTO } from "../types/api";

export const NO_MULTIPLIERS: Multipliers = { income: 1, speed: 1, discount: 1 };

/** Mirrors node_cost() on the server, including the discount. */
export function nodeCost(node: NodeDTO, qty = 1, discount = 1): number {
  const r = node.cost_growth;
  return Math.ceil(((node.base_cost * r ** node.level * (r ** qty - 1)) / (r - 1)) * discount);
}

export const isCycleNode = (n: NodeDTO): boolean => n.cycle_seconds > 0;

/** Seconds for one full round trip after the speed upgrade. */
export const cycleLength = (n: NodeDTO, m: Multipliers): number => n.cycle_seconds / m.speed;

/** Based on the base cycle length: speed means more trips, not bigger ones. */
export const cyclePayout = (n: NodeDTO, level: number, m: Multipliers): number =>
  n.base_income * n.cycle_seconds * level * m.income;

/** Seconds into the current trip, given when it started (ms) and the trip length (s). */
export function cyclePhase(startMs: number, lengthSeconds: number, nowMs: number = Date.now()): number {
  return Math.max(0, ((nowMs - startMs) / 1000) % lengthSeconds);
}

/** Passive income per second (cycle nodes pay in lumps and are excluded). */
export const incomeRate = (nodes: readonly NodeDTO[], m: Multipliers = NO_MULTIPLIERS): number =>
  nodes.reduce((sum, n) => (isCycleNode(n) ? sum : sum + n.level * n.base_income), 0) * m.income;