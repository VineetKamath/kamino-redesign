const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

export const fmtUsd = (n: number, cents = n < 1000) => (cents ? usd2 : usd0).format(n);
export const fmtUsdCompact = (n: number) => `$${compact.format(n)}`;
export const fmtPct = (r: number, digits = 1) => `${(r * 100).toFixed(digits)}%`;
export const fmtSignedPct = (r: number, digits = 2) => `${r >= 0 ? '+' : '−'}${Math.abs(r * 100).toFixed(digits)}%`;
export const fmtToken = (n: number, symbol: string, digits = n < 10 ? 3 : 2) =>
  `${n.toLocaleString('en-US', { maximumFractionDigits: digits })} ${symbol}`;
export const fmtX = (n: number) => `${n.toFixed(1)}×`;
