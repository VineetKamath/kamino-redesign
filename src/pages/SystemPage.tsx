import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, Plus, ShieldCheck, Wallet } from 'lucide-react';
import { HealthGauge } from '../components/HealthGauge';
import { Scrubber } from '../components/Scrubber';
import { AssetRow, AssetRowSkeleton } from '../components/AssetRow';
import { ActionSheet } from '../components/ActionSheet';
import { ToastCard, useToast } from '../components/Toast';
import { EmptyState, ErrorState, GaugeSkeleton } from '../components/States';
import { Button, Card, RiskBadge, Segmented, StatChip, cx } from '../components/primitives';
import { levelTone, liquidationPrice, priceDropToLiquidation, riskLevel, riskZones, safeBorrowHeadroom } from '../lib/risk';
import { fmtPct, fmtUsd } from '../lib/format';

// Demo position uses the live SOL reserve parameters captured 2026-10-23 (research/mechanics.md §1).
const SOL = { price: 103.5, maxLtv: 0.74, liqLtv: 0.8 };
const COLLATERAL_SOL = 10;

export function SystemPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const setTheme_ = (t: 'dark' | 'light') => {
    setTheme(t);
    document.documentElement.dataset.theme = t;
  };

  return (
    <div className="mx-auto flex max-w-content flex-col gap-16 px-4 py-10 md:px-8 md:py-16">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[60ch]">
          <p className="eyebrow">Phase 2 · Design system</p>
          <h1 className="mt-2 text-d-lg font-semibold md:text-d-xl">Calm numbers, loud risk.</h1>
          <p className="mt-4 text-base text-ink-2">
            An evolution of Kamino’s navy and sky-blue, not a replacement. Colour is spent on one thing — how close you are to
            liquidation — so it can never be confused with yield or brand.
          </p>
        </div>
        <Segmented
          label="Theme"
          value={theme}
          onChange={setTheme_}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
        />
      </header>

      <Principles />
      <Colors />
      <Type />
      <SpaceRadiusElevation />
      <Motion />
      <GaugeSection />
      <ScrubberSection />
      <ListsAndChips />
      <Feedback />
    </div>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex flex-col gap-6">
      <div className="max-w-[64ch]">
        <h2 id={`${id}-h`} className="text-d-sm font-semibold md:text-d-md">{title}</h2>
        {intro && <p className="mt-2 text-sm text-ink-2 md:text-base">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function Principles() {
  const items = [
    ['Risk before reward', 'Every screen that changes debt shows where you stand relative to liquidation before it shows APY.'],
    ['Plain words, real numbers', '“Borrow limit” and “Liquidation point” instead of Max/Liq LTV. The raw % stays, in tabular figures.'],
    ['Never colour alone', 'Safe ● Careful ▲ Danger ◆ — every risk colour ships with a solid shape and a word, so it reads in greyscale and for colour-blind users.'],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(([t, b], i) => (
        <Card key={t} className="p-6">
          <p className="num text-xs font-semibold text-accent">0{i + 1}</p>
          <p className="mt-2 text-lg font-semibold">{t}</p>
          <p className="mt-2 text-sm text-ink-2">{b}</p>
        </Card>
      ))}
    </div>
  );
}

/* ── Colour ── */
function Swatch({ name, token, hex, use, className }: { name: string; token: string; hex: string; use: string; className: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-sm ring-1 ring-inset ring-line">
      <div className={cx('h-16', className)} />
      <div className="flex flex-col gap-0.5 bg-surface-1 p-3">
        <span className="text-sm font-semibold">{name}</span>
        <span className="num text-xs text-ink-2">{token} · {hex}</span>
        <span className="text-xs text-ink-3">{use}</span>
      </div>
    </div>
  );
}

function Colors() {
  return (
    <Section
      id="color"
      title="Colour"
      intro="Kamino’s current UI uses green for APY and orange for borrow APY — the same hues a user would read as safe and warning. Here, risk colours mean risk only. Yield is plain ink; action is Kamino blue."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Swatch name="Canvas" token="--canvas" hex="#08111F" use="Page" className="bg-canvas" />
        <Swatch name="Surface 1" token="--surface-1" hex="#0E1929" use="Cards" className="bg-surface-1" />
        <Swatch name="Surface 2" token="--surface-2" hex="#142236" use="Inputs, nested" className="bg-surface-2" />
        <Swatch name="Surface 3" token="--surface-3" hex="#1B2C44" use="Hover, tracks" className="bg-surface-3" />
        <Swatch name="Ink 1" token="--text-1" hex="#EEF3F8" use="Figures, headings · 15.8:1" className="bg-ink-1" />
        <Swatch name="Ink 2" token="--text-2" hex="#A3B4C6" use="Labels · 8.3:1" className="bg-ink-2" />
        <Swatch name="Ink 3" token="--text-3" hex="#8297AD" use="Hints · ≥4.7:1 on all surfaces" className="bg-ink-3" />
        <Swatch name="Kamino blue" token="--accent" hex="#49AFE9" use="Actions only · 7.2:1" className="bg-accent" />
      </div>

      <Card className="p-6">
        <p className="eyebrow">Risk scale</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(
            [
              ['safe', '#3DD6C1', 'Teal, not green — under deuteranopia green and amber converge; teal stays blue-ish.'],
              ['careful', '#F5B83D', 'Amber, the brightest of the three so it pulls attention without alarm.'],
              ['danger', '#FF5C7A', 'Pink-red with the lowest lightness, so the order survives greyscale too.'],
            ] as const
          ).map(([lvl, hex, why]) => (
            <div key={lvl} className="flex flex-col gap-3">
              <div className={cx('h-2 rounded-full', { safe: 'bg-safe', careful: 'bg-caution', danger: 'bg-danger' }[lvl])} />
              <RiskBadge level={lvl} />
              <p className="num text-xs text-ink-2">{hex}</p>
              <p className="text-sm text-ink-2">{why}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 border-t border-line pt-4 text-xs text-ink-3">
          Verified by script (tools/check-colors.mjs): all text ≥ 4.5:1 on every surface in both themes; risk hues keep ΔE ≥ 21 under simulated protanopia, deuteranopia and tritanopia.
        </p>
      </Card>
    </Section>
  );
}

/* ── Type ── */
function Type() {
  const rows = [
    ['d-xl', 'Display XL', '60/62 · Bricolage 600', 'text-d-xl font-display font-semibold'],
    ['d-lg', 'Display L', '44/48', 'text-d-lg font-display font-semibold'],
    ['d-md', 'Display M', '32/38', 'text-d-md font-display font-semibold'],
    ['d-sm', 'Display S', '24/30', 'text-d-sm font-display font-semibold'],
    ['lg', 'UI Large', '18/26 · Plex 600', 'text-lg font-semibold'],
    ['base', 'UI Base', '16/24 · Plex 400', 'text-base'],
    ['sm', 'UI Small (default)', '14/20 · Plex 400', 'text-sm'],
    ['xs', 'UI XS', '12/16 · Plex 500', 'text-xs font-medium'],
  ];
  return (
    <Section
      id="type"
      title="Type"
      intro="Bricolage Grotesque for display — its soft, slightly irregular terminals echo the rounded Kamino wordmark and give headlines a human voice. IBM Plex Sans for UI — it is what Kamino ships today, so the product still feels like Kamino, and it has true tabular figures."
    >
      <Card className="divide-y divide-line">
        {rows.map(([k, name, spec, cls]) => (
          <div key={k} className="flex flex-col gap-1 px-6 py-4 md:flex-row md:items-baseline md:gap-6">
            <span className="w-[160px] shrink-0 text-xs text-ink-3">{name}<br />{spec}</span>
            <span className={cx(cls, 'min-w-0 truncate')}>Borrow against SOL</span>
          </div>
        ))}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <p className="eyebrow">Proportional (avoid)</p>
          <div className="mt-3 flex flex-col items-end text-lg" style={{ fontVariantNumeric: 'proportional-nums' }}>
            <span>$1,111.11</span><span>$8,080.00</span><span>$10,711.17</span>
          </div>
        </Card>
        <Card className="p-6">
          <p className="eyebrow">Tabular + slashed zero (always)</p>
          <div className="num mt-3 flex flex-col items-end text-lg">
            <span>$1,111.11</span><span>$8,080.00</span><span>$10,711.17</span>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ── Space / radius / elevation ── */
function SpaceRadiusElevation() {
  const space = [4, 8, 12, 16, 24, 32, 48, 64];
  return (
    <Section id="space" title="Space, radius, elevation" intro="8-point grid with a 4px half-step for icon gaps. Radii step up with the size of the surface. In dark mode, height is shown by lighter surfaces; real shadows are kept for things that float.">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="eyebrow">Spacing</p>
          <div className="mt-4 flex flex-col gap-2">
            {space.map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className="num w-8 text-right text-xs text-ink-3">{s}</span>
                <span className="h-3 rounded-xs bg-accent/70" style={{ width: s * 2 }} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <p className="eyebrow">Radius</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[['xs', 4, 'chips'], ['sm', 8, 'controls'], ['md', 12, 'cards'], ['lg', 16, 'dialogs'], ['xl', 24, 'sheets'], ['full', 999, 'badges']].map(([k, r, u]) => (
              <div key={k as string} className="flex flex-col items-center gap-1">
                <span className="size-12 bg-surface-3 ring-1 ring-inset ring-line-strong" style={{ borderRadius: r as number }} />
                <span className="num text-xs">{k}</span>
                <span className="text-micro text-ink-3">{u}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <p className="eyebrow">Elevation</p>
          <div className="mt-4 flex flex-col gap-3">
            {[['e1', 'Cards: hairline top light', 'bg-surface-1 shadow-e1'], ['e2', 'Raised: thumbs, active tabs', 'bg-surface-2 shadow-e2'], ['e3', 'Floating: sheets, toasts', 'bg-surface-2 shadow-e3']].map(([k, d, c]) => (
              <div key={k} className={cx('rounded-sm px-4 py-3 ring-1 ring-inset ring-line', c)}>
                <span className="num text-xs font-semibold">{k}</span> <span className="text-xs text-ink-2">{d}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ── Motion ── */
function Motion() {
  const [on, setOn] = useState(false);
  const reduce = useReducedMotion();
  const tokens = [
    ['instant', 80, 'Press feedback', [0.2, 0, 0, 1]],
    ['fast', 140, 'Hover, toggles', [0.2, 0, 0, 1]],
    ['base', 220, 'Panels, tabs', [0.2, 0, 0, 1]],
    ['slow', 360, 'Sheets, page', [0, 0, 0, 1]],
  ] as const;
  return (
    <Section id="motion" title="Motion" intro="Motion explains cause and effect: the needle follows your finger with a spring (stiffness 170, damping 24) so it feels physical, not decorative. Everything else is short and ease-out. With reduced motion on, values jump instantly — nothing is lost because no information lives only in animation.">
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          {tokens.map(([k, ms, use, ease]) => (
            <div key={k} className="flex items-center gap-4">
              <span className="w-[112px] shrink-0 text-xs"><span className="num font-semibold">{k} · {ms}ms</span><br /><span className="text-ink-3">{use}</span></span>
              <div className="relative h-8 flex-1 rounded-xs bg-surface-2">
                <motion.span
                  className="absolute top-1 size-6 rounded-xs bg-accent"
                  animate={{ left: on ? 'calc(100% - 28px)' : '4px' }}
                  transition={reduce ? { duration: 0 } : { duration: ms / 1000, ease: ease as unknown as number[] }}
                />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4">
            <span className="w-[112px] shrink-0 text-xs"><span className="num font-semibold">spring</span><br /><span className="text-ink-3">Gauge needle</span></span>
            <div className="relative h-8 flex-1 rounded-xs bg-surface-2">
              <motion.span
                className="absolute top-1 size-6 rounded-full bg-ink-1"
                animate={{ left: on ? 'calc(100% - 28px)' : '4px' }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 24, mass: 0.9 }}
              />
            </div>
          </div>
          <Button variant="secondary" size="sm" className="self-start" onClick={() => setOn((v) => !v)}>Play motion</Button>
        </div>
      </Card>
    </Section>
  );
}

/* ── Gauge ── */
function GaugeSection() {
  const [debt, setDebt] = useState(380);
  const collateral = COLLATERAL_SOL * SOL.price;
  const ltv = debt / collateral;
  const level = riskLevel(ltv, SOL);
  const headroom = safeBorrowHeadroom(collateral, debt, SOL);
  const states = [
    { label: 'Safe', ltv: 0.42 },
    { label: 'Careful', ltv: 0.68 },
    { label: 'Danger', ltv: 0.77 },
    { label: 'Liquidating', ltv: 0.82 },
  ];

  const sentence =
    level === 'safe'
      ? `You can borrow ${fmtUsd(headroom)} more and stay safe.`
      : level === 'careful'
        ? `Past the safe zone. SOL can fall ${fmtPct(priceDropToLiquidation(ltv, SOL), 0)} before liquidation.`
        : level === 'danger'
          ? `Above your borrow limit. A ${fmtPct(priceDropToLiquidation(ltv, SOL), 0)} drop in SOL starts liquidation.`
          : 'Liquidation has started: ~10% of debt is repaid from collateral each round until you’re back under 80%.';

  return (
    <Section id="gauge" title="Health gauge" intro="One picture for three numbers: where you are (needle), how far you may go (borrow limit tick) and where it breaks (liquidation tick + hatched zone). Bands are set by the price buffer: Safe ≥ 25%, Careful 10–25%, Danger < 10% — a stated design hypothesis, not a Kamino rule. Kamino’s 74% borrow limit sits inside Danger, and we say so.">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card className="flex flex-col items-center gap-6 p-6">
          <p className="eyebrow self-start">Interactive · 10 SOL collateral @ $103.50</p>
          <HealthGauge ltv={ltv} maxLtv={SOL.maxLtv} liqLtv={SOL.liqLtv} size="lg" caption={sentence} />
          <div className="w-full">
            <div className="mb-1 flex justify-between text-sm">
              <label className="text-ink-2" id="borrow-l">Borrow USDC</label>
              <span className="num font-semibold">{fmtUsd(debt)}</span>
            </div>
            <Scrubber
              label="Borrow amount"
              value={debt}
              min={0}
              max={Math.round(collateral * 0.9)}
              step={5}
              onChange={setDebt}
              formatValue={(v) => `${fmtUsd(v)}, LTV ${fmtPct(v / collateral)}`}
              zones={riskZones(SOL).map((z) => ({ from: collateral * z.from, to: collateral * z.to, tone: levelTone(z.level) }))}
              marks={[{ value: collateral * SOL.maxLtv, label: 'Limit' }]}
            />
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          {states.map((s) => (
            <Card key={s.label} className="flex flex-col items-center p-4">
              <HealthGauge ltv={s.ltv} maxLtv={SOL.maxLtv} liqLtv={SOL.liqLtv} size="sm" showLegend={false} />
            </Card>
          ))}
          <Card className="flex flex-col items-center p-4">
            <HealthGauge ltv={0.52} ghostLtv={0.77} maxLtv={SOL.maxLtv} liqLtv={SOL.liqLtv} size="sm" showLegend={false} />
            <p className="mt-2 text-center text-xs text-ink-2">Before → after (ghost needle)</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4">
            <GaugeSkeleton />
            <p className="text-xs text-ink-2">Loading</p>
          </Card>
        </div>
      </div>
    </Section>
  );
}

/* ── Scrubber ── */
function ScrubberSection() {
  const [drop, setDrop] = useState(-10);
  const ltv0 = 0.6;
  const liqDrop = -priceDropToLiquidation(ltv0, SOL) * 100;
  const price = SOL.price * (1 + drop / 100);
  const ltv = ltv0 / (1 + drop / 100);
  const [lev, setLev] = useState(3);
  return (
    <Section id="scrubber" title="Slider / scrubber" intro="One component, three jobs: amounts, price scenarios and leverage. Zones are painted on the track so you see the consequence before you drag there. 44px touch target, full keyboard support (arrows, PgUp/PgDn, Home/End).">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm text-ink-2">If SOL moves</span>
            <span className={cx('num text-lg font-semibold', drop <= liqDrop ? 'text-danger' : 'text-ink-1')}>
              {drop > 0 ? '+' : drop < 0 ? '−' : ''}{Math.abs(drop)}% · {fmtUsd(price)}
            </span>
          </div>
          <Scrubber
            label="SOL price change"
            value={drop}
            min={-60}
            max={20}
            step={1}
            fill={false}
            onChange={setDrop}
            formatValue={(v) => `${v < 0 ? 'minus ' : ''}${Math.abs(v)}%, SOL ${fmtUsd(SOL.price * (1 + v / 100))}`}
            zones={[{ from: -60, to: liqDrop, tone: 'danger' }]}
            marks={[{ value: liqDrop, label: `Liquidation −${Math.abs(Math.round(liqDrop))}%`, tone: 'danger' }, { value: 0, label: 'Today' }]}
            thumbTone={drop <= liqDrop ? 'danger' : 'neutral'}
          />
          <div className="mt-4 flex items-center gap-2 text-sm">
            <RiskBadge level={riskLevel(ltv, SOL)} size="sm" />
            <span className="num text-ink-2">LTV {fmtPct(ltv)} · liquidation at {fmtUsd(liquidationPrice(SOL.price, ltv0, SOL))}</span>
          </div>
        </Card>
        <Card className="p-6">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm text-ink-2">Leverage</span>
            <span className="num text-lg font-semibold">{lev.toFixed(1)}×</span>
          </div>
          <Scrubber
            label="Leverage"
            value={lev}
            min={1.1}
            max={7.7}
            step={0.1}
            onChange={setLev}
            formatValue={(v) => `${v.toFixed(1)} times`}
            zones={[
              { from: 1.1, to: 4, tone: 'safe' },
              { from: 4, to: 6, tone: 'caution' },
              { from: 6, to: 7.7, tone: 'danger' },
            ]}
            marks={[{ value: 1.1, label: '1.1×' }, { value: 7.7, label: 'Max 7.7×' }]}
          />
          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-ink-2">Disabled, with a reason</span>
              <span className="num font-semibold text-ink-3">1.1×</span>
            </div>
            <Scrubber label="Leverage (unavailable)" value={1.1} min={1.1} max={7.7} step={0.1} onChange={() => {}} formatValue={(v) => `${v} times, unavailable`} disabled />
            <p className="text-xs text-ink-2">No SOL is available to borrow in this market right now. Try the Jito market, or check back later.</p>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ── Rows, chips, buttons ── */
function ListsAndChips() {
  const [sel, setSel] = useState('jitosol');
  return (
    <Section id="lists" title="Asset rows, stat chips, buttons" intro="Rows re-flow to two lines on phones instead of truncating six columns. Stat chips hold one number each; tone colours only appear when the number is about risk.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-2">
          <AssetRow symbol="sol" name="SOL" meta="Collateral · Borrow limit 74%" value="10.00" valueLabel="SOL" risk="safe" onClick={() => setSel('sol')} selected={sel === 'sol'} />
          <AssetRow symbol="jitosol" name="JitoSOL / SOL" meta="Multiply · Staking loop" value="4.4%" valueLabel="net APY" risk="careful" onClick={() => setSel('jitosol')} selected={sel === 'jitosol'} />
          <AssetRow symbol="jlp" name="JLP / USDC" meta="Multiply · Directional" value="26.3%" valueLabel="net APY" risk="danger" onClick={() => setSel('jlp')} selected={sel === 'jlp'} />
          <AssetRow symbol="usdc" name="USDC" meta="Earn · Stable yield" value="$1,000" sub="+$3.88 / 30d" />
          <AssetRowSkeleton />
        </Card>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatChip label="Collateral" value="$1,035.00" />
            <StatChip label="Borrowed" value="$380.00" />
            <StatChip label="Liq. price" value="$47.50" tone="danger" delta="SOL −54%" />
            <StatChip label="Net APY" value="4.36%" delta="was 0.00%" />
            <StatChip label="Safe to borrow" value="$241.00" tone="safe" delta="more" />
            <StatChip label="Borrow APY" value="5.30%" />
          </div>
          <Card className="flex flex-wrap gap-3 p-4">
            <Button icon={Plus}>Add collateral</Button>
            <Button variant="secondary" icon={ArrowDownToLine}>Repay</Button>
            <Button variant="ghost">Cancel</Button>
            <Button loading>Confirming</Button>
            <Button disabled icon={Wallet}>Disabled</Button>
            <Button variant="danger" size="sm">Close position</Button>
          </Card>
        </div>
      </div>
    </Section>
  );
}

/* ── Sheets, toasts, empty, error ── */
function Feedback() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <Section id="feedback" title="Sheets, toasts, empty and error states" intro="Every state answers “what happened?” and “what now?”.">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col gap-3 p-6">
          <p className="eyebrow">Action sheet</p>
          <p className="text-sm text-ink-2">Bottom sheet on phones (drag to dismiss), dialog on desktop.</p>
          <Button className="self-start" onClick={() => setOpen(true)}>Open sheet</Button>
          <Button variant="secondary" className="self-start" onClick={() => toast({ tone: 'success', title: 'Position is safe again', body: 'LTV 77% → 52%. You can now borrow $120 more.' })}>
            Fire toast
          </Button>
        </Card>
        <div className="flex flex-col gap-3">
          <ToastCard t={{ tone: 'success', title: 'Auto-protect is on', body: 'If LTV passes 72%, 25% of debt is repaid from collateral.' }} />
          <ToastCard t={{ tone: 'caution', title: 'SOL down 8% today', body: 'Your buffer shrank to 14%. Review your position.' }} />
          <ToastCard t={{ tone: 'danger', title: 'Above your borrow limit', body: 'A 4% drop starts liquidation.' }} />
          <ToastCard t={{ tone: 'info', title: 'Prices refreshed', body: 'Values below use the latest oracle price.' }} />
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <EmptyState icon={ShieldCheck} title="No positions yet" body="Supply SOL as collateral to see your health gauge here." action={<Button size="sm">Supply SOL</Button>} />
          </Card>
          <Card>
            <ErrorState onRetry={() => {}} />
          </Card>
        </div>
      </div>
      <ActionSheet open={open} onClose={() => setOpen(false)} title="Fix my position" description="Three ways back to safe. Each shows the result before you commit.">
        <div className="flex flex-col gap-3">
          {['Add collateral', 'Repay debt', 'Deleverage with collateral'].map((t) => (
            <button key={t} className="flex items-center justify-between rounded-sm bg-surface-2 px-4 py-3 text-left text-sm font-semibold ring-1 ring-inset ring-line hover:bg-surface-3">
              {t}
              <RiskBadge level="safe" size="sm" />
            </button>
          ))}
          <Button size="lg" className="mt-2" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </ActionSheet>
    </Section>
  );
}
