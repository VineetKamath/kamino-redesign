# Phase 3: feature specs and decisions

Each feature lives at its own route. Every review state is a URL: `?state=default|interacting|warning|danger|success|loading|empty`.
Real "before" screenshots: `?view=before`. Screenshots of every state × desktop/mobile are in `shots/phase3/` (80 files).

## Cross-feature decision: risk bands set by price buffer
`buffer = (Liq LTV − LTV) / Liq LTV`, Kamino's own "tolerable decline" formula.
**Safe ≥ 25% · Careful 10–25% · Danger < 10% · Liquidating ≥ Liq LTV.** This is a design hypothesis, labelled as one.
Consequence worth stating: Kamino's 74% SOL borrow limit leaves a 7.5% buffer, which sits **inside Danger**. Kamino allows the borrow; we show it at that limit, but say plainly that it's dangerous.

## F1: Borrow health gauge (`/borrow`)
- **Problem:** the Borrow modal shows "Liquidation LTV 80%" with no current position, and with zero collateral shows a green "LTV 0.00%" (audit A5/A6).
- **Decisions:**
  1. Gauge first on mobile: it answers "is this safe?" before the form asks "how much?".
  2. Collateral is step 1. The empty state says "Add collateral first", which fixes the misleading green 0.00%.
  3. The slider track carries the same bands as the gauge, so the consequence is visible before you drag.
  4. One plain sentence per band: "You can borrow $X more and stay safe" / "SOL can only fall Y%" / "Over Kamino's borrow limit…".
  5. "Max safe" shortcut alongside the amount; Kamino's limit appears as a tick, not as the default max.
  6. Liquidation price and monthly interest in dollars, not only percentages.
- **States:** default $300 (29%) · interacting $520 · warning $700 (67.6%, Careful) · danger $790 (over limit, CTA blocked with reason) · success · loading · empty (no collateral).

## F2: "What if?" scrubber (`/what-if`)
- **Problem:** no way to rehearse a crash. The partial-liquidation explanation is a hover-only tooltip.
- **Evidence:** 10 Oct 2025: SOL fell ~14% in under an hour; ~1,700 wallets liquidated, mostly off-hours (Kamino risk report).
- **Decisions:**
  1. Scrub SOL from −60% to +30%. The gauge, collateral value and a ghost "today" needle react live.
  2. The exact liquidation point is marked on the track ("Liquidation −27.5%").
  3. **One-tap replay of the real Oct 2025 drop**: grounds the abstraction in an event that happened.
  4. Past liquidation, it explains partial liquidation in one line and estimates rounds, SOL sold and fees (from the in-app 10%/round, ~1% fee figures; labelled as an estimate).
  5. Every non-safe state links to Fix my position.
- **States:** default 0% · interacting −18% · warning −12% (Careful) · danger −32% (liquidating, ≈4 rounds) · success (survives Oct 2025) · loading · empty (no debt → sample position).

## F3: Multiply, visualised (`/multiply`)
- **Problem:** the simulator shows APY, fee and exposure, but no liquidation price, LTV, or risk type. It caps silently at 1.7× with "Insufficient Liquidity".
- **Data finding:** with live rates (JitoSOL 4.75%, SOL borrow 5.30%), the docs formula reproduces Kamino's numbers (1.07% vs shown 1.06% at 7.7×; 4.37% vs 4.36% at 1.7×). **Today, more leverage on JitoSOL/SOL earns less.**
- **Decisions:**
  1. The loop picture (deposit → borrow → re-deposit as stacked segments summing to L) is labelled a mental model: Kamino actually uses one flash-loan transaction.
  2. Three numbers side by side, **switched by strategy type**:
     - Staking loop: Net APY · break-even borrow rate · "Price risk: None (both sides in SOL)".
     - Leveraged long: Net APY · liquidation price · price buffer.
  3. Net-APY-vs-leverage curve with you on it, so "more × ≠ more yield" is visible.
  4. One sentence naming the risk that matters: rate drift ("if SOL borrow stayed at 15%, liquidation in ~N years") or price ("a 10% SOL drop starts liquidation; SOL fell 14% in an hour last October").
  5. Empty state uses the real situation (0.00 SOL liquidity) and points to a loop that had liquidity (mSOL/Marinade, $301K).
- **States:** default 2× · interacting 3.5× · warning 5× (Careful) · danger SOL/USDC 3.6× (Danger, −1.12% APY) · success · loading · empty (no liquidity).

## F4: Vault discovery cards (`/discover`)
- **Problem:** three dense tables across three tabs, sorted by APY. Liquidity has no risk column; 0% rows go unexplained.
- **Decisions:**
  1. Grouped by intent ("Stable yield", "Grow your SOL", "Earn trading fees"), not by product tab.
  2. Each card: APY, **30-day preview on $1,000**, a one-sentence yield source, risk chip.
  3. Risk chip uses **Kamino's own vault profile** where it exists; otherwise "est." (our hypothesis, said so).
  4. Warnings live on the card ("Low volume, fees near zero"; "Negative carry").
  5. Details: deposits, "Can you be liquidated?", main risk.
  6. Swipeable rows on phones, grid on desktop, **Table toggle for pros**.
- **States:** default · interacting (card expanded) · warning (LP, near-zero fees) · danger (SOL/USDC −1.64%) · success (deposit) · loading · empty (search "BONK").

## F5: Fix my position (`/position`)
- **Problem:** fixes are spread across separate screens. Kamino's on-chain LTV-triggered orders (`UserLtvAbove` → `DeleverageSingleDebtAmount`) appear nowhere on wallet-less screens.
- **Decisions:**
  1. The alert banner says how far SOL can fall and offers one button.
  2. Sheet with three fixes, **each previewed as a mini gauge with a ghost "before" needle**, the resulting LTV and a badge. Defaults are the smallest amount that gets back to Safe.
  3. The trade-off of each fix in one line (needs USDC / keeps exposure / no wallet funds but less SOL).
  4. **Auto-protect** maps 1:1 to the real primitive: trigger LTV + share of debt to repay. Shows the trigger price, uses 1 of 2 order slots, and the user-capped keeper fee (0.5% is our default).
- **States:** default (Danger, 75.4%) · interacting (sheet open, repay) · warning (Careful) · danger (liquidation in progress) · success (58.0%, Auto-protect on) · loading · empty (no debt).
- **Before:** no real screenshot yet; needs a connected wallet. The page says so instead of recreating it.

## Known gaps / to verify
- **F5 "before" and whether Kamino's UI exposes obligation orders:** needs Vineet's wallet screenshots.
- **Mobile Supply/Borrow modal screenshots:** not captured (row actions sit behind ⋮).
- **Repay-with-collateral swap cost:** 0.1% is an estimate.
- **Liquidation simulation:** uses minimum fees; real fees rise with the size of the breach.
