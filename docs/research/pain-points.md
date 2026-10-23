# Pain points: evidence log

Research date: 2026-10-23. All items are paraphrased. Links are to the original public sources.

## Honesty note
Public, first-person user complaints about Kamino's *UI* are **scarce**. Searches across X, Reddit (via web search; no Reddit threads surfaced), the Kamino governance forum, and review sites turned up mostly praise for the interface, e.g. a [RockawayX analysis](https://www.rockawayx.com/insights/kamino-kmno----still-very-early). I did not search Discord: it needs an account login, which the hard rules exclude.
So the evidence below is mostly **behavioural and first-party**: liquidation incidents, Kamino's own statements about what users don't understand, and educator warnings. The write-up should frame problems as **"risk that the UI under-communicates"**, backed by incident data, not "users are angry". No user quotes are invented.

## Evidence

| # | Evidence | Source | What it suggests (hypothesis) |
|---|---|---|---|
| E1 | Oct 10, 2025 risk event: **~$20M** collateral seized, **8,000+** liquidation events, **~1,700 wallets** hit. SOL fell ~14% in under an hour. Kamino notes the off-hours timing meant few users could actively manage positions. | [Kamino gov forum: Risk Event Analysis, 10 Oct 2025](https://gov.kamino.finance/t/kamino-lend-risk-event-analysis-10th-of-october-2025/847) | Users can't react in time → **automated protection** (Feature 5 Auto-protect) and a **pre-commit "what if"** (Feature 2) have real value. |
| E2 | A separate tally: ~$24.3M of collateral liquidations on Kamino between Oct 8 and 13, 2025. WSOL was largest by value, jitoSOL third. | [@ZackPokorny_ on X, 2025-10-13](https://x.com/ZackPokorny_/status/1977807132520276206) | Corroborates E1. SOL-collateral borrowers are the main population at risk → Feature 1/2 use SOL. |
| E3 | Kamino team member: users can't be liquidated on SOL Multiply by LST depegs because of stake-pool pricing, a protection he believes many users *still* don't understand. | [@dawidsnyders (Kamino) on X, 2024-10-15](https://x.com/dawidsnyders/status/1846121819360596423) | **First-party admission** that core risk mechanics aren't landing with users → Feature 3 must explain *which* risk applies (rate vs price). |
| E4 | Jan 2025, Kamino: "no user has ever been liquidated on Kamino's JLP Multiply" and users "are encouraged to track their position risk". Kamino's current docs say JLP Multiply positions **were** liquidated in the April 2025 and Feb 2026 corrections. | [@kamino on X, 2025-01-31](https://x.com/kamino/status/1885263615436931224) · [Multiply Strategies docs](https://kamino.com/docs/products/multiply/strategies) | Directional Multiply carries real price risk. The burden of "tracking risk" sits on the user, so **liquidation price + buffer must be visible before deposit** (Feature 3). |
| E5 | Educator warning to Multiply users: if SOL borrow rates exceed LST APY, the leverage that made yield easy can get them liquidated. | [@CryptoTaxSucks on X, 2025-01-05](https://x.com/CryptoTaxSucks/status/1876054112930058304) | Rate risk is the non-obvious failure mode for LST loops → Feature 3 "borrow-rate buffer". |
| E6 | Kamino on Multiply: "One of the biggest UX limitations we've observed in Multiply is the price impact risk when closing a position." The same post promises stop-loss/take-profit, target-LTV deleverage, and "Liquidation-protection features". | [Introducing Kamino Lend V2 (gov forum)](https://gov.kamino.finance/t/introducing-kamino-lend-v2/58) | Kamino itself sees protection automation as a UX goal → Feature 5 extends the stated roadmap rather than inventing one. |
| E7 | Kamino's own docs say the buffer that matters is current → *liquidation* LTV, not → max LTV, and that interest raises LTV even with flat prices. | [Borrow Concepts](https://kamino.com/docs/products/borrow/concepts) | The UI shows Max LTV and Liq LTV as two equal-weight numbers, with no "current" line and no buffer → Feature 1. |
| E8 | Kamino docs and app give different liquidation round sizes: 20% (Borrow docs), 10% (Multiply docs), ~10% (in-app tooltip). | [Liquidations](https://kamino.com/docs/products/borrow/liquidations) · [Multiply Risks](https://kamino.com/docs/products/multiply/risks) · `before/reserve-sol-soft-liquidation-tooltip-desktop-crop.png` | Partial liquidation is a genuine user-protective feature but is explained in three places, three ways → Feature 2 one-liner. |
| E9 | Third-party guides advise keeping LTV around 50% instead of 70%, and setting alerts at 70% LTV rather than 80%. | [eco.com Kamino Lending explainer](https://eco.com/support/en/articles/14801186-kamino-lending-solana-s-money-market-explained) · [madeonsol Kamino guide](https://madeonsol.com/blog/kamino-finance-guide) | Users need an *opinionated* safe zone, which the product doesn't provide → Feature 1 safe/careful/danger bands. |

## Pain points → features

| Pain point (hypothesis, from evidence) | Evidence | Feature |
|---|---|---|
| New users can't tell how close they are to liquidation; LTV is shown as raw percentages without a "you are here". | E7, E9, audit A3/A4 | 1 Health Gauge |
| Users can't rehearse a crash before it happens; liquidation price isn't shown pre-commit. | E1, E2, E4 | 2 What-if Scrubber |
| "7.7x" and "1.06% APY" don't say which risk you're taking (price vs borrow rate). | E3, E4, E5 | 3 Multiply Visualised |
| Choosing a vault means reading a dense APY table. LP vaults show 0.00% APY next to millions in TVL with no explanation. | audit A8/A9 | 4 Discovery Cards |
| When things go wrong (often off-hours), there's no guided fix and no visible auto-protection, though the primitive exists on-chain. | E1, E6, mechanics §5 | 5 Fix My Position |

## Still to collect (needs Vineet)
- [ ] Connected-wallet screenshots of **My Position** (Borrow + Multiply). Do they show health/LTV visuals, and do obligation orders appear in the UI?
- [ ] Any Discord #support threads you can read logged in (paste or screenshot; I'll paraphrase).
