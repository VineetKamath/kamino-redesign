# UX audit: Kamino as a new, wallet-less user (2026-10-23)

Lens: a **new user** who holds some SOL and wants to earn or borrow. Severity: **H** blocks understanding of risk, **M** slows decisions, **L** polish.
All findings reference real screenshots in `research/before/`. Anything that needs a connected wallet is marked **[needs wallet]** and is not assumed.

### What Kamino already does well (keep these)
- A consistent dark navy palette, a calm type scale, and real token icons. The brand is already restrained, not "neon DeFi". **Evolve, don't replace.**
- **Earn vault table already has a "Risk Profile" column** (Conservative / Balanced / Aggressive / Institutional) (`earn-lend-overview-desktop.png`). Feature 4 should reuse that vocabulary.
- "Simulate & Deposit" on Multiply previews values *before* connecting a wallet. That's a good instinct to build on.
- Partial ("soft") liquidation is genuinely user-protective, and the tooltip explaining it is good copy that's hidden behind a hover.

---

## Borrow: markets overview (`borrow-markets-overview-{desktop,mobile}.png`)
| # | Problem | Sev |
|---|---|---|
| A1 | The page opens on promotional **AUTO** and **OnRe** RWA markets. The **SOL/BTC Market** ($1.07B of $2.29B, i.e. where most SOL users belong) is **collapsed** and further down. A new user looking for "borrow against SOL" has to find and expand it. | M |
| A2 | Table columns *Total Supply / Total Borrow / Liq LTV / Supply APY / Borrow APY* are market stats, not "what can *I* do". "Liq LTV" appears with no explanation, and stablecoin rows show **0%** Liq LTV (meaning "not usable as collateral"), which reads like an error. | M |
| A3 (mobile) | Values **truncated** at 390px ("$155.0…", "$71.87…"). Supply/Borrow actions are hidden behind a **⋮ kebab** per row, and the table keeps only 2 of 6 columns (Asset, Supplied). APY survives only as a small badge on yield-bearing collateral rows; borrow APY is gone entirely. | H |
| A4 (mobile) | Large empty band below the collapsed markets before "Show more markets". It looks like the page failed to load. | L |

## Borrow modal (`sol-borrow-modal-typed-desktop.png`, `borrow-markets-overview-borrow-modal-desktop.png`)
| # | Problem | Sev |
|---|---|---|
| A5 | Typing **500 SOL (~$51.76K)** into Borrow with zero collateral still shows **"Loan-To-Value 0.00%" in green** in the side panel. No message says *you need collateral first*. Green reads as "safe". | H |
| A6 | Risk is shown as **"Liquidation LTV 80.00%"**: a threshold with no current position and no "how far am I". New users can't turn three percentages (Max 74%, Liq 80%, current) into "am I safe?". | H |
| A7 | The modal is a text list (Borrow APY, Liquidity Available, Liquidation LTV, Price). No visual hierarchy separates *cost* (APY) from *danger* (LTV). "Liquidity Available $0.00" appears with no explanation (the reserve is at 90% utilisation). | M |
| – | Supply modal opens with a large promo ("Boost your AUTO yield up to 28.33% … Go To Multiply") **above** the input, which pushes a leverage product at a first-time supplier. | M |
| – | [needs wallet] Whether a connected-wallet borrow shows a health bar, a post-trade LTV, or a liquidation price. | – |

## Reserve detail: SOL / USDC (`reserve-sol-*.png`, `reserve-usdc-*.png`, `reserve-sol-info-risk-*.png`)
| # | Problem | Sev |
|---|---|---|
| A8 | The page is **analyst-first**: Total Supplied chart, Total Borrowed chart, Utilisation history, Interest-rate curve, Price chart, Proof of reserves. **No "what does this mean for me" block.** The Supply/Borrow CTA is a single "Connect Wallet" button. | M |
| A9 | Risk params (Max LTV 74%, Liq LTV 80%, Soft Liq. from 0.10%, Borrow factor 1.25) sit as equal-weight stat tiles among APY tiles. **Borrow factor 1.25** shrinks the safe borrow, but nothing explains it. | M |
| A10 | The best explanation in the product, the **Soft Liquidations tooltip** (`reserve-sol-soft-liquidation-tooltip-desktop-crop.png`), is a ~120-word hover. Hover doesn't exist on mobile. | M |
| A11 (mobile) | 9,774 px tall at 390px (≈11.6 screens), mostly charts. The six-chart stack has no anchor nav on mobile. | M |

## Multiply: list (`multiply-list-*.png`)
| # | Problem | Sev |
|---|---|---|
| A12 | **70+ rows** ranked by "Max Leverage APY". **Negative APYs** (e.g. SPYx −22.66%, cbBTC −22.71%) sit in the same list with no explanation of why someone would choose them (directional bet, not yield). | H |
| A13 | Headline metric = APY *at max leverage* (e.g. JitoSOL/SOL 1.06% @ 7.7x). This mixes the best-case leverage with the yield, and hides that lower leverage can yield *more* when the spread is thin. | H |
| A14 | The "Strategy" tag (SOL Loop / RWA Loop / Directional Leverage / Stable Loop) is the most decision-relevant field, and it sits in the **last column**, in small grey text. | M |

## Multiply: vault detail + simulator (`multiply-jitosol-sol-*.png`, `multiply-jitosol-sol-sim-10jitosol-*.png`)
| # | Problem | Sev |
|---|---|---|
| A15 | After entering 10 JitoSOL, the simulator shows Net Supply APY, Leverage change, Refundable fee, and Exposure. **No liquidation price, no LTV after deposit, no buffer**, so the risk you're taking never appears before commit. | H |
| A16 | The leverage slider is a bare track labelled "1.1x … 7.3x". There are no risk zones, and no indication that 7.3x is near the 92% liquidation LTV. "Leverage change 1.1x → 1.7x" is the only feedback. | H |
| A17 | The slider **silently capped at 1.7x** (desktop) / stayed at 1.1x (mobile) with an orange **"Insufficient Liquidity"** pill. It doesn't say *why* (SOL liquidity available = 0.00) or what to do (lower amount, choose the Jito-market vault, wait). | M |
| A18 | "Max LTV 87.0% / Liquidation LTV 92.0%" sit in a two-column spec list next to "Market Depeg Risk: None". **"None"** is true only because of stake-rate pricing (mechanics §4), and the page doesn't say that rate risk is the real risk. | M |
| A19 | The Net APY chart shows 4 leverage lines dipping **below 0%** repeatedly over 30 days. That's the most important risk signal on the page, and it's unlabelled. | M |
| A20 (mobile) | Simulator renders first (good), but "Leverage Change 1.1x → 1.1x" plus "Insufficient Liquidity" is a dead end with no next step. | M |

## Liquidity vaults (`liquidity-list-*.png`, `liquidity-pyusd-usdc-*.png`)
| # | Problem | Sev |
|---|---|---|
| A21 | Rows like **MPLX-SOL 0.00% APY, $0.00 volume, $2.62M TVL** sit beside 9.87% rows with no explanation (inactive range? rewards ended?). A new user can't tell if 0% is broken. | M |
| A22 | No risk dimension at all: **impermanent loss** for volatile pairs (JitoSOL-SOL vs MPLX-SOL vs stables) is never mentioned in the list. Earn shows Risk Profile; Liquidity doesn't. | H |
| A23 | Hero cards repeat the top 3 rows of the table below (PYUSD-USDC 6.42%, USDu-USDC 9.87%, hyUSD-USDC 8.31%). That's duplication, not discovery. | L |
| A24 | Filter chips group by *token* (Stables, JitoSOL, SOL, KMNO, BTC, Memes), not by *intent* ("I want stable yield"). | M |

## Cross-cutting
| # | Problem | Sev |
|---|---|---|
| X1 | **Jargon density:** LTV, Liq LTV, eMode, Borrow Factor, Utilisation, Soft Liq., Oracle (Scope), Refundable fee, Exposure, all shown without inline definitions on mobile (dotted-underline tooltips are hover-only). | H |
| X2 | **Colour-only semantics:** green/orange APY text and an orange pill carry meaning with no icon or label pairing. Risky for colour-blind users (~8% of men). | M |
| X3 | **No single "health" concept** anywhere on wallet-less screens. The docs talk about "position health", and the UI shows three separate LTV percentages. | H |
| X4 | **Three different promo carousels** (header banner, Supply modal promo, Multiply hero cards) all push high-APY leverage products. | M |
| X6 (mobile) | Kamino's mobile pages render **418px wide in a 390px viewport** (the 2× captures are 836px wide), so phones get a sideways scroll. Found in Phase 5 while cropping the screenshots. | M |
| X5 | The nav has **7 top-level items** (Swap, Earn, Borrow, Multiply, Liquidity, Portfolio, More) and a "New" badge. Borrow vs Multiply vs Earn isn't explained for a newcomer. | L |

## Mapping to the 5 features
- **F1 Health Gauge** → A5, A6, A9, X3
- **F2 What-if Scrubber** → A6, A10, A15, E1/E2
- **F3 Multiply Visualised** → A13, A15, A16, A17, A18, A19
- **F4 Vault Discovery Cards** → A12, A14, A21, A22, A23, A24
- **F5 Fix My Position** → X3, E1, mechanics §5, plus **[needs wallet]** My Position screenshots

## Screenshot index (`research/before/`)
All captured 2026-10-23 from kamino.com in a clean headless Chrome profile (no wallet), at a device pixel ratio of 2.
- `earn-lend-overview-{desktop,mobile}.png`
- `borrow-markets-overview-{desktop,mobile}.png`, `borrow-markets-overview-{supply,borrow}-modal-desktop.png` (AUTO market)
- `sol-{supply,borrow}-modal-{empty,typed}-desktop.png` (SOL in the SOL/BTC market; typed = 10 SOL supply / 500 SOL borrow)
- `reserve-sol-{desktop,mobile}.png`, `reserve-usdc-{desktop,mobile}.png`, `reserve-sol-info-risk-{desktop,mobile}.png`
- `reserve-sol-soft-liquidation-tooltip-desktop-crop.png` (taken in a 2560px-wide window, not 1440)
- `multiply-list-{desktop,mobile}.png`, `multiply-jitosol-sol-{desktop,mobile}.png`, `multiply-jitosol-sol-sim-10jitosol-{desktop,mobile}.png`
- `liquidity-list-{desktop,mobile}.png`, `liquidity-pyusd-usdc-{desktop,mobile}.png`

**Gaps:** no mobile Supply/Borrow modal (on mobile, actions sit behind a ⋮ menu my script couldn't target reliably). I'll grab these by hand in Phase 4 if you want them. No connected-wallet screens: My Position, health display, obligation orders → **needs you**.
