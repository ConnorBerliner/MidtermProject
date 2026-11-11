import { memo, useCallback, useState } from "react";
import { NodeCard } from "../components/NodeCard";
import { useCanAfford, useNodeCost } from "../hooks/useEconomy";
import { cycleLength, cyclePayout, cyclePhase } from "../lib/math";
import { buy } from "../store/gameSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { NodeDTO } from "../types/api";

const QTY_OPTIONS = [1, 10, 100] as const;

export const NodeCardContainer = memo(function NodeCardContainer({ node }: { node: NodeDTO }) {
  const [qty, setQty] = useState<number>(1);
  const dispatch = useAppDispatch();
  const start = useAppSelector((s) => s.game.cycleStarts[node.slug]);
  const multipliers = useAppSelector((s) => s.game.multipliers);
  const cost = useNodeCost(node, qty);
  const canAfford = useCanAfford(cost);
  const isCycle = node.cycle_seconds > 0;
  const length = cycleLength(node, multipliers);

  const handleBuy = useCallback(
    () => void dispatch(buy(node.slug, qty)),
    [dispatch, node.slug, qty],
  );

  return (
    <NodeCard
      name={node.name}
      level={node.level}
      incomePerSecond={node.base_income * node.level * multipliers.income}
      cost={cost}
      qty={qty}
      qtyOptions={QTY_OPTIONS}
      canAfford={canAfford}
      cycleSeconds={isCycle ? length : undefined}
      cyclePayout={isCycle ? cyclePayout(node, Math.max(node.level, 1), multipliers) : undefined}
      cyclePhaseSeconds={isCycle && start !== undefined ? cyclePhase(start, length) : 0}
      onQtyChange={setQty}
      onBuy={handleBuy}
    />
  );
});