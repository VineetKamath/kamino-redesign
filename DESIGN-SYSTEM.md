# Design system: "Calm numbers, loud risk"

Live reference: `/system` route. Tokens: `src/styles/tokens.css` (CSS variables) → `tailwind.config.js`.
Every colour pairing is checked by `tools/check-colors.mjs` (WCAG contrast + simulated colour-vision deficiency).

## Starting point: what Kamino ships today
Measured from kamino.com's computed styles (2026-10-23):
- **Font:** IBM Plex Sans everywhere. 13 of the 15 most-used text styles are 10–16px.
- **Colour:** navy canvas `#091326`, surfaces `#162136` / `#212C42`, sky-blue accent `#49AFE9`, green `#30D69A` for supply APY, orange `#FFA318` for borrow APY.
- **Shape:** 6px radius on most controls, pill badges.

Decision: **evolve, don't replace**. Kamino's identity is already restrained (no neon, no glass). The problem is semantic, not aesthetic: **green and orange mean "APY" in one place and "safe/warning" in another**, and there's no colour for risk at all.

## Principles
1. **Risk before reward.** Any screen that changes debt shows where you stand relative to liquidation before it shows APY.
2. **Plain words, real numbers.** "Borrow limit" for Max LTV, "Liquidation" for Liquidation LTV. The raw % stays visible, in tabular figures.
3. **Never colour alone.** Each risk level has a colour, a solid shape and a word.

## Colour
| Token | Dark | Light | Use | Why |
|---|---|---|---|---|
| `canvas` | `#08111F` | `#F4F6F9` | Page | Kamino's navy, a touch bluer-neutral so risk hues pop |
| `surface-1/2/3` | `#0E1929 / #142236 / #1B2C44` | white / `#EDF1F6` / `#E1E8F0` | Cards / inputs / hover | In dark mode, height = lighter surface |
| `text-1/2/3` | `#EEF3F8 / #A3B4C6 / #8297AD` | `#0B1626 / #415468 / #52657A` | Figures / labels / hints | Off-white cuts glare in numeric tables. Text-3 lifted from Kamino's `#5F7183` to pass AA |
| `accent` | `#49AFE9` | `#08679E` | **Actions only** | Kamino blue kept unchanged in dark |
| `safe` | `#3DD6C1` | `#05706A` | Risk only | **Teal, not green**: green and amber converge under deuteranopia, teal stays bluish |
| `caution` | `#F5B83D` | `#8A5500` | Risk only | Brightest hue: attention without alarm |
| `danger` | `#FF5C7A` | `#9E0F2F` | Risk only | Lowest lightness, so safe → careful → danger keeps its order in greyscale |

**Yield is not coloured.** APY is plain ink with a sign, so "green" never means both "earning" and "safe".

**Verification** (script output, both themes):
- All text tokens ≥ 4.5:1 on every surface. Lowest: text-3 on surface-3 at 4.68:1 dark.
- Risk hues stay distinguishable (ΔE ≥ 21) under simulated protanopia, deuteranopia and tritanopia.
- Button text on accent: 7.8:1.

### Risk shapes
● Safe · ▲ Careful · ◆ Danger · ◆⚡ Liquidating. These are custom solid glyphs, not outline icons: an outlined circle and octagon became indistinguishable at 12px in testing, so they were replaced.

### Risk bands (design hypothesis, `src/lib/risk.ts`)
Based on Kamino's own "tolerable decline" formula, `(Liq LTV − LTV) / Liq LTV`:
- **Safe:** collateral can fall ≥ 25% before liquidation (LTV ≤ 0.75 × Liq LTV). For SOL that's ≤ 60%.
- **Careful:** above that, but under the Max LTV borrow limit (60–74% for SOL).
- **Danger:** above the borrow limit, below liquidation (74–80%).
- **Liquidating:** ≥ Liq LTV.

The 25% threshold is our choice and will be labelled as such. Rationale: SOL fell ~14% in under an hour on 10 Oct 2025 (Kamino risk report), so a 25% cushion survives a move of that size with margin.

## Type
- **Display: Bricolage Grotesque** (Google Fonts, variable opsz/wdth/wght). Soft, slightly irregular terminals echo the rounded Kamino wordmark and give headlines a human voice for new users, where Plex alone reads as a terminal. Display only (24px and up), never for figures.
- **UI: IBM Plex Sans.** Continuity: it's what Kamino ships, so the redesign still feels like Kamino.
- **All figures:** `.num` → `tabular-nums slashed-zero`. Columns align and 0 never reads as O.
- **Scale:** UI 11 / 12 / 14 (default) / 16 / 18. Display 24 / 32 / 44 / 60 (≈1.333 ratio).

## Space, radius, elevation
- **Spacing:** 8pt grid with a 4px half-step: 4 8 12 16 20 24 32 40 48 64 80 96 128. Off-scale values aren't in the Tailwind theme, so they can't creep in. A build check caught one (`h-11`), which is how the slider bug was found.
- **Radii scale with surface size:** xs 4 (chips) · sm 8 (controls) · md 12 (cards) · lg 16 (dialogs) · xl 24 (sheets) · full (badges). Up from Kamino's flat 6px so nested surfaces read as nested.
- **Elevation:** e1 hairline top highlight (cards) · e2 small shadow (thumbs, active tabs) · e3 deep shadow (sheets, toasts only).

## Motion
| Token | Duration | Easing | Use |
|---|---|---|---|
| instant | 80ms | standard | press feedback |
| fast | 140ms | standard | hover, toggles |
| base | 220ms | standard | panels, tabs, zone dimming |
| slow | 360ms | enter | sheets |
| needle spring | stiffness 170, damping 24, mass 0.9 | spring | gauge needle, leverage loop |

`standard = cubic-bezier(0.2,0,0,1)`, `enter = (0,0,0,1)`, `exit = (0.4,0,1,1)`.
With `prefers-reduced-motion`, all durations go to 0 and springs jump. No information lives only in animation.

## Components (`src/components`)
| Component | Notes | States built |
|---|---|---|
| `HealthGauge` | Semicircle, linear 0–100% LTV. Zones safe/careful/danger, hatched liquidation zone, borrow-limit tick vs longer red liquidation tick, ghost needle for before→after, `role="meter"` with a spoken summary | safe, careful, danger, liquidating, before→after, loading |
| `Scrubber` | One slider for amounts, price scenarios and leverage. Risk zones on the track; the part past the thumb is dimmed. Labelled marks. 44px hit area. Arrows, PgUp/PgDn, Home/End | default, dragging, zones, marks, disabled-with-reason |
| `StatChip` | One number per chip; tone only when the number is about risk | neutral, safe, danger, with delta |
| `AssetRow` | Reflows to 2 lines at 390px instead of truncating columns | default, hover, selected, with risk, skeleton |
| `ActionSheet` | Bottom sheet on phones (drag to dismiss), dialog ≥768px. Esc, focus in/out | open/closed |
| `Toast` | Risk tones reuse ● ▲ ◆, `aria-live` | info, success, caution, danger |
| `EmptyState` / `ErrorState` | Always says what happened and what to do next | empty, error + retry |
| `Button` | primary (accent), secondary, ghost, danger | default, hover, loading (not dimmed), disabled |
| `Footer` | The required disclaimer, on every route | — |

## Token icons
Official Kamino CDN: `logos.kamino.finance/token-logos/<mint>.png` (the same files kamino.com loads). List in `public/tokens/SOURCES.md`. UI icons: Lucide.

## Not yet done
- Light theme is token-complete and passes checks, but hasn't been reviewed per screen. Dark is primary.
- Leverage-slider zones on `/system` are placeholders. Phase 3 derives them from real Multiply maths (`research/mechanics.md` §4).
