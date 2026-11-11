export type UpgradeEffect = "income" | "speed" | "discount";

export interface NodeDTO {
  slug: string;
  name: string;
  base_cost: number;
  cost_growth: number;
  base_income: number;
  level: number;
  cycle_seconds: number;
  cycle_elapsed: number;
}

export interface UpgradeDTO {
  slug: string;
  name: string;
  description: string;
  effect: UpgradeEffect;
  per_level: number;
  max_level: number;
  level: number;
  next_cost: number | null;
}

export interface Multipliers {
  income: number;
  speed: number;
  discount: number;
}

export interface AchievementDTO {
  slug: string;
  name: string;
  description: string;
}

export interface GameState {
  currency: number;
  offline_earned: number;
  income_per_second: number;
  nodes: NodeDTO[];
  achievements: AchievementDTO[];
  upgrades: UpgradeDTO[];
  multipliers: Multipliers;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
  refresh?: string;
}

export interface BuyPayload {
  node: string;
  qty: number;
}