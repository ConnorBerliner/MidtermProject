import { memo, useId } from "react";
import { formatNumber } from "../lib/format";

interface UpgradeCardProps {
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  currentBonus: string;
  nextCost: number | null;
  canAfford: boolean;
  onBuy: () => void;
}

export const UpgradeCard = memo(function UpgradeCard(props: UpgradeCardProps) {
  const { name, description, level, maxLevel, currentBonus, nextCost, canAfford, onBuy } = props;
  const headingId = useId();

  return (
    <article className="card" aria-labelledby={headingId}>
      <h3 id={headingId}>
        {name}{" "}
        <small>
          Lv {level}/{maxLevel}
        </small>
      </h3>
      <p>{description}</p>
      <p>Current bonus: {currentBonus}</p>
      <button type="button" disabled={nextCost === null || !canAfford} onClick={onBuy}>
        {nextCost === null ? "Maxed out" : `Upgrade — ${formatNumber(nextCost)}`}
      </button>
    </article>
  );
});