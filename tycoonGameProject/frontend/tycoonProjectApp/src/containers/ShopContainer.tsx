import { useAppSelector } from "../store/hooks";
import { UpgradeCardContainer } from "./UpgradeCardContainer";

export function ShopContainer() {
  const upgrades = useAppSelector((s) => s.game.upgrades);
  if (upgrades.length === 0) return null;

  return (
    <section className="shop" aria-label="Upgrade shop">
      <h2>Upgrade Shop</h2>
      <div className="grid">
        {upgrades.map((u) => (
          <UpgradeCardContainer key={u.slug} upgrade={u} />
        ))}
      </div>
    </section>
  );
}