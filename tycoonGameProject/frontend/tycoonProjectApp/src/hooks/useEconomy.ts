import { useMemo } from "react";
import { incomeRate, nodeCost } from "../lib/math";
import { useAppSelector } from "../store/hooks";
import type { NodeDTO } from "../types/api";

export function useNodeCost(node: NodeDTO, qty: number): number {
  return useMemo(() => nodeCost(node, qty), [node, qty]);
}

export function useCanAfford(cost: number): boolean {
  return useAppSelector((s) => s.game.currency >= cost);
}

export function useIncomeRate(): number {
  return useAppSelector((s) => incomeRate(s.game.nodes));
}