import { memo, useCallback } from "react";
import { UpgradeCard } from "../components/UpgradeCard";
import { useCanAfford } from "../hooks/useEconomy";
import { buyUpgrade } from "../store/gameSlice";
import { useAppDispatch } from "../store/hooks";
import type { UpgradeDTO } from "../types/api";

function bonusLabel(u: UpgradeDTO): string {
  const pct = Math.round(u.per_level * u.level * 100);
  if (u.effect === "discount") return `${pct}% off purchases`;
  if (u.effect === "speed") return `+${pct}% cargo speed`;
  return `+${pct}% income`;
}

export const UpgradeCardContainer = memo(function UpgradeCardContainer({
  upgrade,
}: {
  upgrade: UpgradeDTO;
}) {
  const dispatch = useAppDispatch();
  const canAfford = useCanAfford(upgrade.next_cost ?? Infinity);
  const handleBuy = useCallback(
    () => void dispatch(buyUpgrade(upgrade.slug)),
    [dispatch, upgrade.slug],
  );

  return (
    <UpgradeCard
      name={upgrade.name}
      description={upgrade.description}
      level={upgrade.level}
      maxLevel={upgrade.max_level}
      currentBonus={bonusLabel(upgrade)}
      nextCost={upgrade.next_cost}
      canAfford={canAfford}
      onBuy={handleBuy}
    />
  );
});