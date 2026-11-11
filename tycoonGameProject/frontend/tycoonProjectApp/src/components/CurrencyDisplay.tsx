import { formatNumber } from "../lib/format";

interface CurrencyDisplayProps {
  currency: number;
  incomePerSecond: number;
}

export function CurrencyDisplay({ currency, incomePerSecond }: CurrencyDisplayProps) {
  return (
    <section aria-label="Balance">
      <h1>$ {formatNumber(currency)}</h1>
      <p>{formatNumber(incomePerSecond)} / sec</p>
    </section>
  );
}