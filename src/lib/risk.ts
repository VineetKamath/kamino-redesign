/**
 * Risk model shared by every feature.
 *
 * Kamino's docs: "the buffer that actually matters is the gap between Current LTV and Liquidation LTV".
 * Tolerable price drop = (liqLtv − ltv) / liqLtv  (kamino.com/docs/products/borrow/concepts).
 *
 * Bands are defined purely by that buffer (design HYPOTHESIS, stated in the write-up, not a Kamino rule):
 *   safe          buffer ≥ 25%   collateral can fall a quarter before liquidation
 *   careful       10% – 25%
 *   danger        < 10%          one ordinary bad day liquidates you
 *   liquidatable  ltv ≥ liqLtv
 * Kamino's Max LTV ("borrow limit") is shown separately as a tick. For SOL it sits at a 7.5% buffer —
 * i.e. inside Danger. Kamino will let you borrow there; we say plainly that it's dangerous.
 */
export type RiskLevel = 'safe' | 'careful' | 'danger' | 'liquidatable';

export interface RiskParams {
  maxLtv: number; // 0–1, Kamino "Max LTV" → shown as "Borrow limit"
  liqLtv: number; // 0–1, Kamino "Liquidation LTV" → shown as "Liquidation"
}

export const SAFE_BUFFER = 0.25;
export const DANGER_BUFFER = 0.1;

export const safeLimit = ({ liqLtv }: RiskParams) => liqLtv * (1 - SAFE_BUFFER);
export const dangerLimit = ({ liqLtv }: RiskParams) => liqLtv * (1 - DANGER_BUFFER);

/** Band edges in LTV units, for painting gauges and sliders. */
export const riskZones = (p: RiskParams) => [
  { from: 0, to: safeLimit(p), level: 'safe' as const },
  { from: safeLimit(p), to: dangerLimit(p), level: 'careful' as const },
  { from: dangerLimit(p), to: p.liqLtv, level: 'danger' as const },
];

export function riskLevel(ltv: number, p: RiskParams): RiskLevel {
  if (ltv >= p.liqLtv) return 'liquidatable';
  if (ltv > dangerLimit(p)) return 'danger';
  if (ltv > safeLimit(p)) return 'careful';
  return 'safe';
}

/** Share by which collateral price can fall before liquidation (volatile collateral, stable debt). */
export const priceDropToLiquidation = (ltv: number, { liqLtv }: RiskParams) =>
  ltv <= 0 ? 1 : Math.max(0, (liqLtv - ltv) / liqLtv);

/** Collateral price at which the position becomes liquidatable. */
export const liquidationPrice = (price: number, ltv: number, { liqLtv }: RiskParams) =>
  ltv <= 0 ? 0 : (price * ltv) / liqLtv;

/** Extra debt (USD) that keeps the position inside the safe band. */
export const safeBorrowHeadroom = (collateralUsd: number, debtUsd: number, p: RiskParams) =>
  Math.max(0, collateralUsd * safeLimit(p) - debtUsd);

export const RISK_COPY: Record<RiskLevel, { label: string; short: string }> = {
  safe: { label: 'Safe', short: '25%+ price buffer' },
  careful: { label: 'Careful', short: '10–25% buffer' },
  danger: { label: 'Danger', short: 'Under 10% buffer' },
  liquidatable: { label: 'Liquidating', short: 'Being partially liquidated' },
};

/** Tone helper shared by chips, sliders and copy. */
export const levelTone = (l: RiskLevel) => (l === 'safe' ? 'safe' : l === 'careful' ? 'caution' : 'danger') as 'safe' | 'caution' | 'danger';
