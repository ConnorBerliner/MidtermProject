import { memo, useId } from "react";
import { formatNumber } from "../lib/format";

interface NodeCardProps {
  name: string;
  level: number;
  incomePerSecond: number;
  cost: number;
  qty: number;
  qtyOptions: readonly number[];
  canAfford: boolean;
  cycleSeconds?: number;
  cyclePayout?: number;
  cyclePhaseSeconds?: number;
  onQtyChange: (qty: number) => void;
  onBuy: () => void;
}

export const NodeCard = memo(function NodeCard(props: NodeCardProps) {
  const {
    name,
    level,
    incomePerSecond,
    cost,
    qty,
    qtyOptions,
    canAfford,
    cycleSeconds,
    cyclePayout,
    cyclePhaseSeconds,
    onQtyChange,
    onBuy,
  } = props;
  const headingId = useId();

  return (
    <article className="card" aria-labelledby={headingId}>
      <h3 id={headingId}>
        {name} <small>Lv {level}</small>
      </h3>
      {cycleSeconds !== undefined && cycleSeconds > 0 ? (
        <>
          <p>
            Pays {formatNumber(cyclePayout ?? 0)} every {cycleSeconds}s
          </p>
          <div className="cycle-track" aria-hidden="true">
            <div
              className={level > 0 ? "cycle-fill running" : "cycle-fill"}
              style={{
                animationDuration: `${cycleSeconds}s`,
                animationDelay: `${-(cyclePhaseSeconds ?? 0)}s`,
              }}
            />
          </div>
        </>
      ) : (
        <p>+{formatNumber(incomePerSecond)}/sec</p>
      )}
      <div role="group" aria-label={`Purchase quantity for ${name}`}>
        {qtyOptions.map((q) => (
          <button key={q} type="button" aria-pressed={q === qty} onClick={() => onQtyChange(q)}>
            ×{q}
          </button>
        ))}
      </div>
      <button type="button" disabled={!canAfford} onClick={onBuy}>
        Buy ×{qty} — {formatNumber(cost)}
      </button>
    </article>
  );
});