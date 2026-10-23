import { LIQUIDATION } from '../data/kamino';

/*
  Estimate of Kamino's partial ("soft") liquidation, using the in-app tooltip numbers:
  each round repays ~10% of debt with the same value of collateral, plus a fee of ~1% of the unwound amount.
  Rounds repeat until LTV is back under the liquidation threshold. Above ~95% LTV the whole position may close.
  This is an ESTIMATE for explanation — the real bonus grows with how far past the threshold you are.
*/
export interface LiquidationSim {
  rounds: number;
  collateralSoldUsd: number;
  debtRepaidUsd: number;
  feesUsd: number;
  endLtv: number;
  full: boolean;
}

export function simulatePartialLiquidation(collateralUsd: number, debtUsd: number, liqLtv: number): LiquidationSim {
  let c = collateralUsd;
  let d = debtUsd;
  let rounds = 0;
  let fees = 0;
  if (d / c >= LIQUIDATION.fullLiquidationLtv) {
    return { rounds: 1, collateralSoldUsd: c, debtRepaidUsd: d, feesUsd: c - d, endLtv: 0, full: true };
  }
  while (d / c >= liqLtv && rounds < 50) {
    const repay = d * LIQUIDATION.closeFactor;
    const fee = repay * LIQUIDATION.feeOfUnwound;
    d -= repay;
    c -= repay + fee;
    fees += fee;
    rounds++;
  }
  return { rounds, collateralSoldUsd: collateralUsd - c, debtRepaidUsd: debtUsd - d, feesUsd: fees, endLtv: d / c, full: false };
}
