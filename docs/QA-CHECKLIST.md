# Final QA checklist

Checked 23–24 Oct 2026. ✅ = verified by script or by eye; ⚠️ = known gap, stated openly.

## Coverage: before / after × mobile / desktop
| Feature | Before (real) desktop | Before (real) mobile | After desktop (7 states) | After mobile (7 states) |
|---|---|---|---|---|
| 1 Borrow health gauge | ✅ | ✅ | ✅ | ✅ |
| 2 What-if scrubber | ✅ | ✅ | ✅ | ✅ |
| 3 Multiply, visualised | ✅ | ✅ | ✅ | ✅ |
| 4 Vault discovery | ✅ | ✅ | ✅ | ✅ |
| 5 Fix my position | ⚠️ needs connected wallet | ⚠️ needs connected wallet | ✅ | ✅ |

Feature 5's "before" is shown as a labelled gap, never recreated.

## Prototype
- ✅ Every state reachable by URL (`?state=default|interacting|warning|danger|success|loading|empty`); "Kamino today" toggle on every feature page.
- ✅ Production build passes (`npm run build`).
- ✅ 84 screenshots (5 features × 7 states × 2 sizes + before views + landing + system): no console errors, no horizontal overflow at 390 or 1440.
- ✅ WCAG 2.1 A/AA: **0 axe violations** across every route × state × size (`tools/a11y.mjs`).
- ✅ Colour: all text ≥ 4.5:1 on every surface in dark and light; risk hues distinct under simulated protanopia, deuteranopia, tritanopia (`tools/check-colors.mjs`).
- ✅ Keyboard: 8/8 checks (slider keys, focus-trapped sheet, Esc + focus return) (`tools/keyboard.mjs`).
- ✅ `prefers-reduced-motion` respected (screenshots taken with it on).
- ✅ Disclaimer footer on all 8 routes: "Concept redesign by Vineet Kamath — not affiliated with Kamino. Mock data, no wallet connection."
- ⚠️ Frame rate not profiled; animations are one spring needle and CSS transitions.

## Live deployment
- ✅ https://kamino-redesign-six.vercel.app: every route, state URL, deep link and asset returns 200 (no deployment protection).
- ✅ Live real-browser check (`tools/live-check.mjs`): 18 page loads at 390 and 1440, no console errors, footer everywhere, no horizontal overflow.

## Links and content
- ✅ All 24 external links return HTTP 200.
- ✅ No lorem ipsum, TODO or placeholder text.
- ✅ No fabricated data: numbers come from the 23 Oct 2026 kamino.com snapshot or Kamino docs; Multiply maths matches Kamino's 1.06% (we get 1.07%); hypotheses (risk bands, "est." vault labels, swap-cost estimate, liquidation-fee estimate) are labelled where they appear.
- ✅ No invented user quotes. Evidence is Kamino's own incident report, docs, on-chain source and public posts, with links.

## Figma
- ✅ Pages 00–09; one Color collection with Dark + Light modes; text styles; components (Risk badge, Button, Stat chip, Health gauge).
- ✅ 72 editable "after" screens (text and vectors, not images); 12 real "before" screenshots; numbered callouts on all five feature boards.
- ✅ Two prototype flows on page 08.
