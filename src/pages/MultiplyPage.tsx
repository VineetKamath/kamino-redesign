import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CircleCheck, Info, Repeat2 } from 'lucide-react';
import { FeatureFrame } from '../components/FeatureFrame';
import { HealthGauge } from '../components/HealthGauge';
import { Scrubber } from '../components/Scrubber';
import { EmptyState } from '../components/States';
import { Shimmer } from '../components/AssetRow';
import { Button, Card, RiskBadge, Segmented, StatChip, TokenPair, cx } from '../components/primitives';
import { useToast } from '../components/Toast';
import { useReviewState, type ReviewState } from '../lib/review';
import { levelTone, liquidationPrice, priceDropToLiquidation, riskLevel, riskZones } from '../lib/risk';
import { breakEvenBorrow, fmtYears, loopSegments, ltvAt, netApy, yearsToLiquidation } from '../lib/multiply';
import { fmtPct, fmtSignedPct, fmtUsd } from '../lib/format';
import { MULTIPLY, SOL, type MultiplyStrategy } from '../data/kamino';

const DEPOSIT_USD = 1035; // DEMO: 10 SOL worth

const PRESET: Record<ReviewState, { id: 'jitosol' | 'sol'; L: number }> = {
  default: { id: 'jitosol', L: 2 },
  interacting: { id: 'jitosol', L: 3.5 },
  warning: { id: 'jitosol', L: 5 },
  danger: { id: 'sol', L: 3.6 },
  success: { id: 'jitosol', L: 2 },
  loading: { id: 'jitosol', L: 2 },
  empty: { id: 'jitosol', L: 2 },
};

export function MultiplyPage() {
  const [state] = useReviewState();
  return (
    <FeatureFrame
      n={3}
      title="Multiply, visualised"
      problem="Kamino’s simulator turns “3×” into APY, a fee and an exposure figure — but never shows liquidation price, LTV, or which risk you’re taking. For JitoSOL/SOL today, more leverage actually earns less."
      evidence={[
        { label: 'Kamino team: users don’t understand the LST protection', href: 'https://x.com/dawidsnyders/status/1846121819360596423' },
        { label: 'Docs: Net APY formula', href: 'https://kamino.com/docs/products/multiply/how-it-works' },
        { label: 'Docs: JLP Multiply liquidated in Apr 2025 / Feb 2026', href: 'https://kamino.com/docs/products/multiply/strategies' },
      ]}
      before={[
        { desktop: 'multiply-jitosol-sol-sim-10jitosol-desktop.webp', mobile: 'multiply-jitosol-sol-sim-10jitosol-mobile.webp', caption: 'JitoSOL/SOL simulator after typing 10 JitoSOL: no liquidation price, no LTV, slider capped at 1.7× by “Insufficient Liquidity”' },
        { desktop: 'multiply-list-desktop.webp', mobile: 'multiply-list-mobile.webp', caption: 'Multiply list ranked by APY at maximum leverage, negative APYs mixed in' },
      ]}
    >
      <MultiplyFlow key={state} state={state} />
    </FeatureFrame>
  );
}

function MultiplyFlow({ state }: { state: ReviewState }) {
  const [id, setId] = useState(PRESET[state].id);
  const [L, setL] = useState(PRESET[state].L);
  const [opened, setOpened] = useState(state === 'success');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const s = MULTIPLY[id];
  const staking = s.kind === 'staking-loop';

  if (state === 'loading') return <Loading />;
  if (state === 'empty') {
    return (
      <Card>
        <EmptyState
          icon={Repeat2}
          title="No SOL to borrow in this vault right now"
          body="Every loop borrows SOL, and this market has 0.00 SOL available (true on 23 Oct 2026). Kamino shows this as an orange “Insufficient Liquidity” pill. Here, we say why and what to do."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary">Try mSOL / SOL (Marinade market · $301K SOL free)</Button>
              <Button variant="ghost">Notify me when liquidity returns</Button>
            </div>
          }
        />
      </Card>
    );
  }

  const ltv = ltvAt(L);
  const level = riskLevel(ltv, s);
  const apy = netApy(s, L);
  const apy1 = netApy(s, 1);
  const pickStrategy = (v: 'jitosol' | 'sol') => {
    setId(v);
    setL((x) => Math.min(x, MULTIPLY[v].maxLeverage));
  };

  const open = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOpened(true);
      toast({ tone: 'success', title: `Opened ${L.toFixed(1)}× ${s.collateral}/${s.debt}`, body: 'Demo only — nothing was sent on-chain.' });
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-3">
          <TokenPair a={s.collateral.toLowerCase()} b={s.debt.toLowerCase()} size={32} />
          <div>
            <p className="font-semibold">{s.collateral} / {s.debt} Multiply</p>
            <p className="text-xs text-ink-2">{staking ? 'Staking loop · SOL price doesn’t affect liquidation' : 'Leveraged long · a SOL drop can liquidate you'}</p>
          </div>
        </div>
        <Segmented
          label="Strategy"
          value={id}
          onChange={pickStrategy}
          options={[
            { value: 'jitosol', label: 'Staking loop' },
            { value: 'sol', label: 'Leveraged long' },
          ]}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-[1.25fr_1fr] md:gap-6">
        <Card className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="eyebrow">What {L.toFixed(1)}× means</p>
              <p className="mt-1 text-sm text-ink-2">
                {fmtUsd(DEPOSIT_USD)} of yours becomes {fmtUsd(DEPOSIT_USD * L)} of {s.collateral}, with {fmtUsd(DEPOSIT_USD * (L - 1))} borrowed.
              </p>
            </div>
          </div>
          <LoopViz L={L} maxL={s.maxLeverage} animate={!opened} />

          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-sm text-ink-2">Leverage</label>
              <span className="num text-d-sm font-semibold">{L.toFixed(1)}×</span>
            </div>
            <Scrubber
              label="Leverage"
              value={L}
              min={1.1}
              max={s.maxLeverage}
              step={0.1}
              onChange={setL}
              active={state === 'interacting'}
              thumbTone={levelTone(level)}
              formatValue={(v) => `${v.toFixed(1)}×, net APY ${fmtPct(netApy(s, v), 2)}`}
              zones={riskZones(s).map((z) => ({ from: Math.max(1.1, 1 / (1 - z.from)), to: Math.min(s.maxLeverage, 1 / (1 - z.to)), tone: levelTone(z.level) })).filter((z) => z.to > z.from)}
              marks={[{ value: 1.1, label: '1.1×' }, { value: s.maxLeverage, label: `Max ${s.maxLeverage}×` }]}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="grid grid-cols-1 gap-3 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">At {L.toFixed(1)}×</p>
              <RiskBadge level={level} size="sm" />
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <StatChip label="Net APY" value={fmtSignedPct(apy)} delta={`1×: ${fmtSignedPct(apy1)}`} tone={apy < 0 ? 'danger' : 'neutral'} />
              {staking ? (
                <>
                  <StatChip label="Break-even rate" value={fmtPct(breakEvenBorrow(s, L), 2)} delta={`SOL borrow now ${fmtPct(s.borrowApy, 2)}`} />
                  <StatChip label="Price risk" value="None" delta="Both sides in SOL" />
                </>
              ) : (
                <>
                  <StatChip label="Liq. price" value={fmtUsd(liquidationPrice(SOL.price, ltv, s))} tone={levelTone(level)} delta={`SOL ${fmtUsd(SOL.price)} now`} />
                  <StatChip label="Price buffer" value={`−${fmtPct(priceDropToLiquidation(ltv, s), 0)}`} tone={levelTone(level)} delta="to liquidation" />
                </>
              )}
            </div>
            <ApyCurve s={s} L={L} />
          </Card>

        </div>
      </div>

      {/* Full-width summary row: where this lands, the one risk that matters, and the action */}
      <Card className="flex flex-col items-center gap-4 p-4 md:flex-row md:gap-8 md:p-6">
        <div className="w-full max-w-[200px] shrink-0">
          <HealthGauge ltv={ltv} maxLtv={s.maxLtv} liqLtv={s.liqLtv} size="sm" showLegend={false} />
        </div>
        <div className="flex-1">
          <WhyLine s={s} L={L} apy={apy} apy1={apy1} />
        </div>
        <div className="w-full md:w-[300px] md:shrink-0">
          {opened ? (
            <div className="flex items-center gap-3 rounded-sm bg-safe/10 p-4">
              <CircleCheck className="shrink-0 text-safe" size={20} />
              <p className="flex-1 text-sm"><span className="font-semibold">Open at {L.toFixed(1)}×.</span> <span className="text-ink-2">We’ll warn you if the borrow rate nears {fmtPct(breakEvenBorrow(s, L), 1)}.</span></p>
            </div>
          ) : (
            <Button size="lg" className="w-full" icon={ArrowRight} loading={submitting} onClick={open}>
              {submitting ? 'Opening…' : `Open ${L.toFixed(1)}× with ${fmtUsd(DEPOSIT_USD)}`}
            </Button>
          )}
          <p className="mt-2 text-center text-xs text-ink-3">Demo only — no transaction is sent.</p>
        </div>
      </Card>
    </div>
  );
}

/* One plain sentence that names THE risk for this strategy at this leverage. */
function WhyLine({ s, L, apy, apy1 }: { s: MultiplyStrategy; L: number; apy: number; apy1: number }) {
  if (s.kind === 'staking-loop') {
    const negativeSpread = s.borrowApy > s.collateralYield;
    return (
      <p className="flex gap-2 text-sm text-ink-2">
        <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-accent" />
        <span>
          {negativeSpread
            ? `Right now borrowing SOL (${fmtPct(s.borrowApy, 2)}) costs more than JitoSOL earns (${fmtPct(s.collateralYield, 2)}), so ${L.toFixed(1)}× earns ${apy < apy1 ? 'less' : 'more'} than holding JitoSOL. `
            : ''}
          If SOL borrow stayed at 15%, this position would reach liquidation in {fmtYears(yearsToLiquidation(s, L, 0.15))}.
        </span>
      </p>
    );
  }
  return (
    <p className="flex gap-2 text-sm text-ink-2">
      <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-accent" />
      <span>
        This is a bet on SOL’s price. A {fmtPct(priceDropToLiquidation(ltvAt(L), s), 0)} SOL drop starts liquidation — on 10 Oct 2025 SOL fell 14% in under an hour.
        {apy < 0 ? ' You also pay more interest than you earn while you wait.' : ''}
      </span>
    </p>
  );
}

/* Deposit → borrow → re-deposit, as stacked segments that sum to L. Mental model, not the on-chain path. */
function LoopViz({ L, maxL, animate }: { L: number; maxL: number; animate: boolean }) {
  const reduce = useReducedMotion();
  const { segs, rest } = loopSegments(L);
  const scale = (v: number) => `${(v / maxL) * 100}%`;
  const key = L.toFixed(1);
  return (
    <div className="flex flex-col gap-3" aria-label={`Exposure ${L.toFixed(1)} times your deposit; debt ${(L - 1).toFixed(1)} times`}>
      <div className="flex items-center gap-3">
        <span className="w-[72px] shrink-0 text-xs text-ink-2">Exposure</span>
        <div className="relative flex h-10 flex-1 overflow-hidden rounded-xs bg-surface-2">
          <AnimatePresence initial={false} mode="popLayout">
            {segs.map((v, i) => (
              <motion.div
                key={`${key}-${i}`}
                className={cx('h-full border-r-2 border-surface-1', i === 0 ? 'bg-ink-1' : 'bg-accent')}
                style={{ width: scale(v), opacity: i === 0 ? 1 : Math.max(0.35, 1 - i * 0.12) }}
                initial={animate && !reduce ? { scaleX: 0, originX: 0 } : false}
                animate={{ scaleX: 1 }}
                transition={{ delay: reduce ? 0 : i * 0.12, duration: reduce ? 0 : 0.28, ease: [0, 0, 0, 1] }}
              />
            ))}
            {rest > 0 && (
              <motion.div
                key={`${key}-rest`}
                className="hatch h-full text-accent/50"
                style={{ width: scale(rest) }}
                initial={animate && !reduce ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : segs.length * 0.12 }}
              />
            )}
          </AnimatePresence>
        </div>
        <span className="num w-12 text-right text-sm font-semibold">{L.toFixed(1)}×</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-[72px] shrink-0 text-xs text-ink-2">Debt</span>
        <div className="relative h-3 flex-1 rounded-xs bg-surface-2">
          <motion.div className="h-full rounded-xs bg-ink-3" animate={{ width: scale(L - 1) }} transition={{ duration: reduce ? 0 : 0.36, ease: [0.2, 0, 0, 1] }} />
        </div>
        <span className="num w-12 text-right text-sm text-ink-2">{(L - 1).toFixed(1)}×</span>
      </div>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
        <li className="flex items-center gap-1"><span className="size-2 rounded-xs bg-ink-1" /> Your deposit</li>
        <li aria-hidden>→</li>
        <li className="flex items-center gap-1"><span className="size-2 rounded-xs bg-accent" /> borrow &amp; re-deposit</li>
        <li aria-hidden>→</li>
        <li>repeat {segs.length - 1 + (rest > 0 ? 1 : 0)}× until {L.toFixed(1)}×</li>
      </ol>
      <p className="text-micro text-ink-3">How to think about it — Kamino actually does this in one transaction with a flash loan.</p>
    </div>
  );
}

/* Net APY across the whole leverage range, with you on it. Makes "more leverage ≠ more yield" visible. */
function ApyCurve({ s, L }: { s: MultiplyStrategy; L: number }) {
  const W = 300, H = 72, P = 6;
  const xs = Array.from({ length: 40 }, (_, i) => 1 + (i / 39) * (s.maxLeverage - 1));
  const ys = xs.map((x) => netApy(s, x));
  const lo = Math.min(0, ...ys), hi = Math.max(0, ...ys);
  const X = (x: number) => P + ((x - 1) / (s.maxLeverage - 1)) * (W - 2 * P);
  const Y = (y: number) => P + (1 - (y - lo) / (hi - lo || 1)) * (H - 2 * P);
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(' ');
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Net APY falls from ${fmtPct(ys[0], 2)} at 1× to ${fmtPct(ys[ys.length - 1], 2)} at ${s.maxLeverage}×`}>
        <line x1={P} x2={W - P} y1={Y(0)} y2={Y(0)} stroke="rgb(var(--line-strong))" strokeDasharray="3 4" />
        <path d={d} fill="none" stroke="rgb(var(--text-2))" strokeWidth={2} />
        <circle cx={X(L)} cy={Y(netApy(s, L))} r={5} fill="rgb(var(--accent))" stroke="rgb(var(--surface-1))" strokeWidth={2} />
      </svg>
      <figcaption className="flex justify-between text-micro text-ink-3">
        <span>1× · {fmtSignedPct(ys[0])}</span>
        <span>Net APY by leverage</span>
        <span>{s.maxLeverage}× · {fmtSignedPct(ys[ys.length - 1])}</span>
      </figcaption>
    </figure>
  );
}

function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-[1.25fr_1fr] md:gap-6" aria-busy>
      <Card className="flex flex-col gap-6 p-8">
        <Shimmer className="h-4 w-40 rounded-xs" />
        <Shimmer className="h-10 rounded-xs" />
        <Shimmer className="h-3 rounded-xs" />
        <Shimmer className="h-2 rounded-full" />
      </Card>
      <Card className="flex flex-col gap-3 p-6">
        <div className="grid grid-cols-3 gap-3">
          <Shimmer className="h-16 rounded-sm" /><Shimmer className="h-16 rounded-sm" /><Shimmer className="h-16 rounded-sm" />
        </div>
        <Shimmer className="h-[72px] rounded-sm" />
      </Card>
    </div>
  );
}
