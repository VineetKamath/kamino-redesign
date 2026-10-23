/*
  Mock data. Every number is a snapshot of kamino.com on 2026-10-23 (no wallet connected)
  unless marked HYPOTHESIS or DEMO. Raw snapshots: research/snapshot-2026-10-23.json and research/before/*.png.
*/

export const SNAPSHOT_DATE = '23 Oct 2026';

/* ── SOL/BTC ("main") market reserves — research/before/reserve-sol-desktop.png, borrow-markets-overview-desktop.png ── */
export const SOL = {
  symbol: 'SOL',
  price: 103.5, // oracle price on reserve page ($103.43–$103.58 during capture)
  maxLtv: 0.74, // "Max LTV 74.00%"
  liqLtv: 0.8, // "Liq. LTV 80.00%"
  supplyApy: 0.0405,
  borrowApy: 0.053,
  borrowFactor: 1.25,
  utilisation: 0.9036,
};

export const USDC = {
  symbol: 'USDC',
  price: 1,
  supplyApy: 0.0457,
  borrowApy: 0.0604, // SOL/BTC market USDC borrow APY
  borrowFactor: 1,
};

/* Liquidation mechanics — in-app "Soft Liquidations" tooltip on the SOL reserve (see mechanics.md §3) */
export const LIQUIDATION = {
  closeFactor: 0.1, // "~10% of your debt is automatically repaid"
  feeOfUnwound: 0.01, // "calculated as 1.00% of the 10% unwind amount" (minimum; grows with breach)
  fullLiquidationLtv: 0.95, // docs: insolvency-risk threshold, close factor → 100%
};

/* Market stress reference — gov.kamino.finance risk event analysis, 10 Oct 2025 */
export const OCT_2025 = { drop: -0.14, label: 'Oct 10 2025: −14% in under an hour' };

/* ── Multiply ── */
export interface MultiplyStrategy {
  id: string;
  kind: 'staking-loop' | 'directional';
  collateral: string;
  debt: string;
  market: string;
  collateralYield: number; // staking / supply yield of collateral
  borrowApy: number;
  maxLtv: number;
  liqLtv: number;
  maxLeverage: number;
  liquidityAvailable: number; // USD
}

export const MULTIPLY: Record<string, MultiplyStrategy> = {
  // multiply-jitosol-sol-desktop.png: Max LTV 87%, Liq LTV 92%, Max leverage 7.7x, Max leverage APY 1.06%, liquidity 0.00 SOL.
  // JitoSOL yield 4.75% (borrow page badge), SOL borrow 5.30% → formula gives 1.07% at 7.7x, 4.36% at 1.7x (matches simulator).
  jitosol: {
    id: 'jitosol',
    kind: 'staking-loop',
    collateral: 'JitoSOL',
    debt: 'SOL',
    market: 'SOL/BTC Market',
    collateralYield: 0.0475,
    borrowApy: 0.053,
    maxLtv: 0.87,
    liqLtv: 0.92,
    maxLeverage: 7.7,
    liquidityAvailable: 0,
  },
  // multiply list: SOL / SOL/BTC Market / USDC: max 3.8x, liquidity $10.22M. Uses SOL supply 4.05% and USDC borrow 6.04%.
  sol: {
    id: 'sol',
    kind: 'directional',
    collateral: 'SOL',
    debt: 'USDC',
    market: 'SOL/BTC Market',
    collateralYield: 0.0405,
    borrowApy: 0.0604,
    maxLtv: 0.74,
    liqLtv: 0.8,
    maxLeverage: 3.8,
    liquidityAvailable: 10_220_000,
  },
};

/* ── Discovery (Feature 4) — earn-lend-overview, liquidity-list, multiply-list snapshots ── */
export type Intent = 'stable' | 'sol' | 'lp';
export type VaultRisk = 'Conservative' | 'Balanced' | 'Aggressive';

export interface Vault {
  id: string;
  name: string;
  curator: string;
  intent: Intent;
  product: 'Earn' | 'Multiply' | 'Liquidity';
  tokens: [string] | [string, string];
  apy: number; // as displayed by Kamino; for Multiply = at the leverage shown
  tvl: number;
  /** Kamino "Vault Profile" for Earn vaults; HYPOTHESIS for Multiply/Liquidity (Kamino shows none). */
  risk: VaultRisk;
  riskIsKamino: boolean;
  source: string; // plain-language yield source (our copy)
  atLeverage?: number; // Multiply: the leverage Kamino's listed APY assumes
  note?: string;
}

export const VAULTS: Vault[] = [
  // Earn — APY and Vault Profile exactly as listed (Include KMNO Rewards toggle on)
  { id: 'steak-usdg-hy', name: 'Steakhouse USDG High Yield', curator: 'Steakhouse', intent: 'stable', product: 'Earn', tokens: ['usdg'], apy: 0.0739, tvl: 48_500_000, risk: 'Balanced', riskIsKamino: true, source: 'Lends USDG to borrowers across several Kamino markets.' },
  { id: 'allez-usdc', name: 'Allez USDC', curator: 'Allez Labs', intent: 'stable', product: 'Earn', tokens: ['usdc'], apy: 0.0658, tvl: 10_530_000, risk: 'Balanced', riskIsKamino: true, source: 'Lends USDC to borrowers across several Kamino markets.' },
  { id: 'sentora-pyusd', name: 'Sentora PYUSD', curator: 'Sentora', intent: 'stable', product: 'Earn', tokens: ['pyusd'], apy: 0.0594, tvl: 108_090_000, risk: 'Balanced', riskIsKamino: true, source: 'Lends PYUSD; the largest Earn vault by deposits.' },
  { id: 'steak-usdc', name: 'Steakhouse USDC', curator: 'Steakhouse', intent: 'stable', product: 'Earn', tokens: ['usdc'], apy: 0.0432, tvl: 19_300_000, risk: 'Conservative', riskIsKamino: true, source: 'Lends USDC to borrowers. Kamino rates it the lowest-risk profile.' },
  { id: 'elemental-usdc', name: 'Elemental USDC Optimizer', curator: 'Elemental', intent: 'stable', product: 'Earn', tokens: ['usdc'], apy: 0.071, tvl: 4_670_000, risk: 'Aggressive', riskIsKamino: true, source: 'Moves USDC between markets aiming for the top rate. Kamino rates it Aggressive.' },
  { id: 'allez-sol', name: 'Allez SOL', curator: 'Allez Labs', intent: 'sol', product: 'Earn', tokens: ['sol'], apy: 0.0392, tvl: 8_440_000, risk: 'Balanced', riskIsKamino: true, source: 'Lends SOL to borrowers. No leverage, no liquidation risk for you.' },

  // Multiply — APY at max leverage as listed; risk is our HYPOTHESIS
  { id: 'm-jitosol', name: 'JitoSOL / SOL Multiply', curator: 'Kamino', intent: 'sol', product: 'Multiply', tokens: ['jitosol', 'sol'], apy: 0.0106, tvl: 5_400_000, risk: 'Balanced', riskIsKamino: false, source: 'Loops staking yield. SOL price moves don’t liquidate you; a borrow rate above the staking yield does, slowly.', atLeverage: 7.7, note: 'SOL borrow currently costs more than JitoSOL earns, so lower leverage earns more today.' },
  { id: 'm-jupsol', name: 'JupSOL / SOL Multiply', curator: 'Kamino', intent: 'sol', product: 'Multiply', tokens: ['jupsol', 'sol'], apy: 0.0361, tvl: 11_560_000, risk: 'Balanced', riskIsKamino: false, source: 'Loops JupSOL staking yield against borrowed SOL. SOL price moves don’t liquidate you.', atLeverage: 7.7 },
  { id: 'm-sol-usdc', name: 'SOL / USDC Multiply', curator: 'Kamino', intent: 'sol', product: 'Multiply', tokens: ['sol', 'usdc'], apy: -0.0164, tvl: 856_110, risk: 'Aggressive', riskIsKamino: false, source: 'A leveraged bet that SOL goes up. A SOL drop can liquidate you.', atLeverage: 3.8, note: 'Negative carry: you pay more to borrow USDC than SOL earns.' },

  // Liquidity — 7D fees APY as listed; risk is our HYPOTHESIS (pegged pairs Conservative, volatile pairs Aggressive)
  { id: 'lp-pyusd-usdc', name: 'PYUSD–USDC', curator: 'Kamino', intent: 'lp', product: 'Liquidity', tokens: ['pyusd', 'usdc'], apy: 0.0643, tvl: 16_690_000, risk: 'Conservative', riskIsKamino: false, source: 'Earns swap fees between two dollar stablecoins. Kamino re-centres the range for you.' },
  { id: 'lp-jitosol-sol', name: 'JitoSOL–SOL', curator: 'Kamino', intent: 'lp', product: 'Liquidity', tokens: ['jitosol', 'sol'], apy: 0.0332, tvl: 5_810_000, risk: 'Balanced', riskIsKamino: false, source: 'Earns swap fees between SOL and its staked version, plus some staking yield.' },
  { id: 'lp-usdg-usdc', name: 'USDG–USDC', curator: 'Kamino', intent: 'lp', product: 'Liquidity', tokens: ['usdg', 'usdc'], apy: 0.001, tvl: 10_510_000, risk: 'Conservative', riskIsKamino: false, source: 'Swap fees between two stablecoins.', note: 'Low trading volume this week, so fees are near zero.' },
];

export const INTENTS: Record<Intent, { title: string; blurb: string }> = {
  stable: { title: 'Stable yield', blurb: 'Dollars in, dollars out. Earn from lending.' },
  sol: { title: 'Grow your SOL', blurb: 'Stay in SOL; earn more of it — with or without leverage.' },
  lp: { title: 'Earn trading fees', blurb: 'Provide liquidity to a pair; Kamino manages the range.' },
};

/* ── DEMO position (Features 1, 2, 5) — hypothetical user, not a real wallet ── */
export const DEMO_WALLET = { sol: 12.5, usdc: 400 };
