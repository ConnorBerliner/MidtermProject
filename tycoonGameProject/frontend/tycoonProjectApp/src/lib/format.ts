const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx"];

export function formatNumber(n: number): string {
  if (n < 1000) return n.toFixed(n < 10 ? 2 : 0);
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) return n.toExponential(2);
  return (n / 1000 ** tier).toFixed(2) + SUFFIXES[tier];
}