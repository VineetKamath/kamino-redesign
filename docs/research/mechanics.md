# Kamino mechanics: what the redesign must represent correctly

Research date: 2026-10-23. Note: `docs.kamino.finance` now 301-redirects to `kamino.com/docs`, and `app.kamino.finance` redirects to `kamino.com`.
Raw copies of the doc pages used are in `research/docs-raw/`.

## 1. The three LTVs (core of Feature 1)

`LTV = debt value / collateral value` (debt is risk-adjusted by Borrow Factor, see §2).

| Value | Meaning | Source |
|---|---|---|
| **Current LTV** | Live debt/collateral ratio. Determines health. | [Borrowing](https://kamino.com/docs/products/borrow/borrowing) |
| **Max LTV** | Ceiling for *opening or increasing* a borrow. You can't originate debt above this. | same |
| **Liquidation LTV** | Threshold where the position becomes liquidatable. Always > Max LTV. | same |

Key line from the docs (paraphrased): the buffer that actually matters is **Current → Liquidation LTV**, not Current → Max LTV, because Max LTV is used up at origination. ([Concepts](https://kamino.com/docs/products/borrow/concepts))

**Tolerable price drop** (docs formula, collateral volatile and debt stable):
```
tolerable decline = (Liquidation LTV − Current LTV) / Liquidation LTV
```
Docs example: 50 SOL @ $200 = $10,000, borrow $7,000 → 70% LTV. Liq LTV 80% → a 12.5% SOL drop ($175) makes it liquidatable.

**Liquidation price** (derived from the same formula, for single-collateral, stable-debt positions):
```
liq price = current price × (Current LTV / Liquidation LTV)
```

**Interest drift:** debt accrues continuously, so LTV rises even with flat prices. The docs show 70% → 77% over a year with no price move. ([Concepts](https://kamino.com/docs/products/borrow/concepts))

### Live values observed (SOL/BTC "main" market, 2026-10-23, screenshots in `before/`)
| Reserve | Max LTV | Liq LTV | Borrow factor | Supply APY | Borrow APY | Utilisation | Price |
|---|---|---|---|---|---|---|---|
| SOL | 74.00% | 80.00% | 1.25 | 4.05% | 5.30% | 90.36% | ~$103.5 |
| JitoSOL (as Multiply collateral vs SOL, eMode) | 87.0% | 92.0% | – | – | – | – | 1.31 SOL |

The SOL/BTC market is $1.07B of a $2.29B total market size. Active borrows: $885.6M.

## 2. Borrow Factor (often invisible, changes the real buffer)
`Borrow capacity = (Collateral value × Max LTV) / Borrow Factor`. USDC BF = 1. Riskier debt has BF > 1 (docs example: BONK = 2, which halves capacity). SOL debt shows BF 1.25 on the reserve page. A higher BF also makes a position liquidatable at a *lower real* debt than the headline Liq LTV suggests. ([Borrowing](https://kamino.com/docs/products/borrow/borrowing))
**Design implication:** the gauge must use risk-adjusted LTV, and the UI should say so once, in plain language, when BF ≠ 1.

## 3. Liquidation: partial / "soft" liquidation (Feature 2 explainer line)

- **Partial:** each liquidation closes only part of the debt. If still above Liq LTV, another round follows. Adding collateral or repaying between rounds stops the process.
- **Sources disagree on the size of a round. Flag this, don't paper over it:**
  - Borrow docs: max **20%** of debt per round. ([Liquidations](https://kamino.com/docs/products/borrow/liquidations))
  - Multiply risks doc: up to **10%** per transaction. ([Multiply Risks](https://kamino.com/docs/products/multiply/risks))
  - In-app "Soft Liquidations" tooltip on the SOL reserve: "~10% of your debt is automatically repaid using the same amount of collateral", fee "as low as ~0.10%" of collateral (1% of the 10% unwound). Screenshot: `before/reserve-sol-soft-liquidation-tooltip-desktop-crop.png`.
  - **Decision for prototype:** follow the in-app copy (~10% per round), since the app is what users see. Footnote the discrepancy.
- **Full liquidation:** above the market's insolvency-risk threshold (typically **95% LTV**), the close factor rises to 100%.
- **Dynamic bonus** paid to liquidators: starts at a reserve min (docs example 2%), grows with the breach depth, caps at max (example 8%), then shrinks near 100% LTV (solvency cap).
- **No grace period:** "liquidation can occur at any time" once Liq LTV is crossed.
- **Auto-deleverage** (separate, systemic): Risk Council multisig vote → **72-hour margin call** with no penalty → forced deleverage of the riskiest positions. Never triggered as of the docs. ([Auto-Deleverage](https://kamino.com/docs/risk/safeguards/auto-deleverage))

## 4. Multiply loops (Feature 3)

One atomic transaction using a flash loan (fee 0.001%):
1. User sets deposit + target leverage. 2. Flash-borrow the extra. 3. Swap to the target asset (e.g. SOL→JitoSOL). 4. Deposit everything as collateral. 5. Borrow the debt asset against it. 6. Repay the flash loan. 7. Position sits at the target leverage. ([How it works](https://kamino.com/docs/products/multiply/how-it-works))

> Note for the visual: the real mechanism is **not** a repeated deposit→borrow loop on-chain. It's a flash loan that reaches the end state in one step. The animated loop in Feature 3 is a *mental model*. Label it "what 3x means", not "what the transaction does".

Formulas:
```
Max leverage = 1 / (1 − Max LTV)                   (87% → 7.7x, shown in app)
LTV at leverage L = (L − 1) / L                    (3x → 66.7%)
Net APY = Collateral yield × L − Borrow rate × (L − 1)
```
Docs worked example: 8x JitoSOL/SOL, JitoSOL 7%, SOL borrow 6% → 14% net. If the borrow rate rises to 7.5%, the spread inverts and net APY goes negative. "There is no floor."

**Two Multiply risk types** ([Tips for avoiding liquidation](https://kamino.com/docs/learn/multiply/risks-and-liquidations)):
- **Correlated loops (SOL LSTs, stables, RWAs):** SOL price moves barely affect LTV. LSTs are priced at the **stake-pool exchange rate**, not market price, so market depegs don't liquidate. The risk is **borrow rate > collateral yield** for a long time, so LTV drifts up. The docs claim "Zero liquidations ... on SOL LST Multiply positions as of March 2026". ([Strategies](https://kamino.com/docs/products/multiply/strategies))
- **Directional (JLP, xStocks, SOL/USDC):** collateral price vs USD matters directly. JLP Multiply positions *were* liquidated in the April 2025 and February 2026 corrections (same source).

**Design implication:** "liquidation price" and a "price drop buffer" only make sense for directional loops. For JitoSOL/SOL the honest equivalent is **"borrow-rate buffer"**: how high the SOL borrow APY can go before net APY turns negative, and how long until liquidation at that rate. Feature 3 must switch its third metric by strategy type, not fake a SOL-price liquidation for an LST loop.

eMode max LTVs (docs): SOL/BTC market LSTs vs SOL ~87% (~7.5–7.7x). Jito market JitoSOL/SOL 90% (10x; app shows 12.5x on the list). Standard SOL/USDC 75% (~4x). JLP/USDC 67% (~3.2x).

## 5. LTV-based automated orders ("obligation orders") (Feature 5 "Auto-protect")

Confirmed in the on-chain program source ([klend `obligation_order_operations.rs`](https://github.com/Kamino-Finance/klend/blob/master/programs/klend/src/state/obligation_order_operations.rs), [`obligation.rs`](https://github.com/Kamino-Finance/klend/blob/master/programs/klend/src/state/obligation.rs)):
- Each obligation (position) holds **2 order slots** (`obligation_orders: [ObligationOrder; 2]`).
- **Condition types:** `UserLtvAbove`, `UserLtvBelow`, `DebtCollPriceRatioAbove`, `DebtCollPriceRatioBelow`, `LiquidationLtvCloserThan`, `Always`, `Never`.
- **Opportunity (action) types:** `DeleverageSingleDebtAmount`, `DeleverageAllDebt`.
- Each order carries a **min/max execution bonus (bps)** paid to the keeper that executes it, so protection has a small cost.
- Kamino's Lend V2 announcement promised "Limit orders (target leverage, take profit, stop loss, deleverage, releverage)" and "Liquidation-protection features". ([Introducing Kamino Lend V2](https://gov.kamino.finance/t/introducing-kamino-lend-v2/58))
- **Not verified:** whether/where the current app exposes these orders to a connected wallet. Nothing surfaced on any wallet-less screen. **→ Needs a connected-wallet screenshot from Vineet (My Position tab) before we call it "missing".**

**Design implication:** "Auto-protect" maps 1:1 to a real primitive: *"If LTV goes above X%, repay Y with collateral"* = `UserLtvAbove` + `DeleverageSingleDebtAmount`. Max 2 rules per position; show the keeper fee range.

## 6. Repay with collateral (Feature 5 "deleverage" fix)
Kamino swaps some of your collateral into the debt asset and repays in one atomic tx, so you don't need the debt token in your wallet. ([Borrowing](https://kamino.com/docs/products/borrow/borrowing))
Fixes ranked by the docs: add collateral, repay (usually "more capital-efficient when close to the threshold"), repay with collateral.

## 7. Cross vs isolated mode
In Cross Mode, health is computed across all collateral and debt combined, so a drop in any one collateral hurts the whole position. ([Borrowing](https://kamino.com/docs/products/borrow/borrowing)) The prototype will use a single-collateral, single-debt position and say so.
