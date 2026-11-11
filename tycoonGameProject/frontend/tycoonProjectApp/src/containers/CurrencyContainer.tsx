import { CurrencyDisplay } from "../components/CurrencyDisplay";
import { useIncomeRate } from "../hooks/useEconomy";
import { useAppSelector } from "../store/hooks";

export function CurrencyContainer() {
  const currency = useAppSelector((s) => s.game.currency);
  const rate = useIncomeRate();
  return <CurrencyDisplay currency={currency} incomePerSecond={rate} />;
}