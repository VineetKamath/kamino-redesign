# Kamino, redesigned: know how close you are to liquidation

*Vineet Kamath · concept, not affiliated with Kamino · [live prototype](https://kamino-redesign-six.vercel.app) · [Figma](https://www.figma.com/design/GHO9koxTsxN8yE7zzaVxOO)*

> *Imagine it's a Friday night. You borrow $780 against 10 SOL, and Kamino tells you "Liquidation LTV 80%". It doesn't tell you that a 6% dip in SOL is enough to start selling your collateral. You close the laptop. On 10 Oct 2025, SOL fell 14% in under an hour, off-hours, and ~1,700 Kamino wallets were partially liquidated.*

**The problem.** Kamino's risk engine is forgiving, but its interface hides that. Risk shows up as three bare percentages, a borrow with no collateral shows a green "LTV 0.00%", and green means both "earning" and "safe". On 10 Oct 2025, SOL fell ~14% in under an hour and ~1,700 Kamino wallets were partially liquidated ([risk report](https://gov.kamino.finance/t/kamino-lend-risk-event-analysis-10th-of-october-2025/847)).

**The principle.** Keep Kamino's look; spend colour on one thing, distance from liquidation, always with a shape and a word (● Safe ▲ Careful ◆ Danger).

**Five decisions**
1. **Borrow health gauge.** One gauge replaces three percentages: where you are, Kamino's limit, and where liquidation starts. It comes with one sentence: "You can borrow $321 more and stay safe."
2. **"What if?" scrubber.** Drag SOL's price, or replay October 2025, and see exactly when liquidation starts and roughly what it would cost.
3. **Multiply, visualised.** Show the risk that applies to *this* strategy (the borrow rate for staking loops, the price for leveraged longs), and that more leverage currently earns *less* (Kamino's own 1.06% at 7.7×).
4. **Vault cards by goal.** Replace three APY tables with cards showing what $1,000 earns in 30 days and a plain risk label. The table stays one tap away.
5. **Fix my position.** Three fixes, each previewed before you commit, plus Auto-protect, built on Kamino's existing on-chain LTV orders.

**Honest limits.** The Safe/Careful/Danger bands (≥25% / 10–25% / <10% price buffer) are my design choice. Feature 5's "before" needs a connected wallet and isn't shown. All "before" screens are real kamino.com screenshots from 23 Oct 2026.
