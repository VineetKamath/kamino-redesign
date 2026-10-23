import type { MultiplyStrategy } from '../data/kamino';

/*
  Multiply maths — kamino.com/docs/products/multiply/how-it-works
    LTV at leverage L       = (L − 1) / L
    Net APY                 = yield × L − borrow × (L − 1)
  Check against the live app (JitoSOL/SOL, yield 4.75%, SOL borrow 5.30%):
    7.7× → 1.07% (Kamino shows 1.06%), 1.7× → 4.37% (simulator shows 4.36%).
*/
export const ltvAt = (L: number) => (L - 1) / L;
export const netApy = (s: MultiplyStrategy, L: number) => s.collateralYield * L - s.borrowApy * (L - 1);

/** Borrow APY at which the loop stops earning anything. */
export const breakEvenBorrow = (s: MultiplyStrategy, L: number) => (L <= 1 ? Infinity : (s.collateralYield * L) / (L - 1));

/**
 * Staking loops are SOL-on-SOL, so SOL's price doesn't move LTV. What moves it is interest:
 * debt grows at the borrow rate, collateral at the staking rate. Years until LTV reaches liquidation:
 *   t = ln(liqLtv / ltv) / ln((1 + borrow) / (1 + yield))      (∞ if borrow ≤ yield)
 */
export function yearsToLiquidation(s: MultiplyStrategy, L: number, borrowApy = s.borrowApy) {
  if (borrowApy <= s.collateralYield) return Infinity;
  return Math.log(s.liqLtv / ltvAt(L)) / Math.log((1 + borrowApy) / (1 + s.collateralYield));
}

export const fmtYears = (y: number) =>
  !isFinite(y) || y > 50 ? 'Never at this rate' : y >= 2 ? `~${Math.round(y)} years` : y >= 1 / 12 ? `~${Math.round(y * 12)} months` : `~${Math.max(1, Math.round(y * 52))} weeks`;

/** Loop segments for the "deposit → borrow → re-deposit" picture: 1, ltv, ltv², … summing to L. */
export function loopSegments(L: number, maxSteps = 7) {
  const r = ltvAt(L);
  const segs: number[] = [];
  let sum = 0;
  for (let k = 0; k < maxSteps && sum < L - 0.01; k++) {
    const v = Math.pow(r, k);
    segs.push(v);
    sum += v;
  }
  const rest = L - sum;
  return { segs, rest: rest > 0.01 ? rest : 0 };
}
