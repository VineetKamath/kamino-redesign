import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleCheck, History, LifeBuoy, RotateCcw } from 'lucide-react';
import { FeatureFrame } from '../components/FeatureFrame';
import { HealthGauge } from '../components/HealthGauge';
import { Scrubber } from '../components/Scrubber';
import { EmptyState, GaugeSkeleton } from '../components/States';
import { Shimmer } from '../components/AssetRow';
import { Button, Card, RiskGlyph, StatChip, TokenIcon, cx } from '../components/primitives';
import { useReviewState, type ReviewState } from '../lib/review';
import { liquidationPrice, priceDropToLiquidation, riskLevel } from '../lib/risk';
import { simulatePartialLiquidation } from '../lib/liquidation';
import { fmtPct, fmtUsd } from '../lib/format';
import { OCT_2025, SOL } from '../data/kamino';

// DEMO position: 10 SOL collateral, $600 USDC debt → 58% LTV (just inside Safe).
const POS = { sol: 10, debt: 600 };

const PRESET: Record<ReviewState, number> = {
  default: 0,
  interacting: -18,
  warning: -12,
  danger: -32,
  success: -14,
  loading: 0,
  empty: 0,
};

export function WhatIfPage() {
  const [state] = useReviewState();
  return (
    <FeatureFrame
      n={2}
      title="“What if?” liquidation scrubber"
      problem="Kamino shows a liquidation threshold but never lets you rehearse a crash. On 10 Oct 2025, SOL fell 14% in under an hour and ~1,700 wallets were liquidated — mostly off-hours, when few could react."
      evidence={[
        { label: 'Kamino risk report, 10 Oct 2025', href: 'https://gov.kamino.finance/t/kamino-lend-risk-event-analysis-10th-of-october-2025/847' },
        { label: 'Kamino docs: liquidations', href: 'https://kamino.com/docs/products/borrow/liquidations' },
      ]}
      before={[
        { desktop: 'reserve-sol-soft-liquidation-tooltip-desktop-crop.webp', caption: 'The best explanation of partial liquidation is a ~120-word hover tooltip (no hover on phones)' },
        { desktop: 'reserve-sol-desktop.webp', mobile: 'reserve-sol-mobile.webp', caption: 'Reserve page: six market charts, no scenario for your own position' },
      ]}
    >
      <Scenario key={state} state={state} />
    </FeatureFrame>
  );
}

function Scenario({ state }: { state: ReviewState }) {
  const [move, setMove] = useState(PRESET[state]);
  const [hasPosition, setHasPosition] = useState(state !== 'empty');
  const navigate = useNavigate();

  if (state === 'loading') return <Loading />;
  if (!hasPosition) {
    return (
      <Card>
        <EmptyState
          title="No borrow to stress-test"
          body="You don’t have debt, so price drops can’t liquidate you. Try the scrubber on a sample position to see how it works."
          action={<Button onClick={() => setHasPosition(true)}>Try a sample position</Button>}
        />
      </Card>
    );
  }

  const collateral0 = POS.sol * SOL.price;
  const ltv0 = POS.debt / collateral0;
  const liqMove = -priceDropToLiquidation(ltv0, SOL); // e.g. −0.275
  const liqMovePct = Math.round(liqMove * 1000) / 10;
  // Price moves at which LTV crosses each band edge: LTV = debt / (sol × price)
  const moveAt = (ltvEdge: number) => (POS.debt / (POS.sol * ltvEdge) / SOL.price - 1) * 100;
  const dangerMovePct = moveAt(SOL.liqLtv * 0.9);
  const safeMovePct = moveAt(SOL.liqLtv * 0.75);
  const price = SOL.price * (1 + move / 100);
  const liqPrice = liquidationPrice(SOL.price, ltv0, SOL);
  const furtherDrop = Math.max(0, 1 - liqPrice / price); // from the scenario price, not from today
  const collateral = POS.sol * price;
  const ltv = POS.debt / collateral;
  const level = riskLevel(ltv, SOL);
  const liquidating = level === 'liquidatable';
  const sim = liquidating ? simulatePartialLiquidation(collateral, POS.debt, SOL.liqLtv) : null;
  const survivesOct = OCT_2025.drop * 100 > liqMovePct;
  const tone = { safe: 'neutral', careful: 'caution', danger: 'danger', liquidatable: 'danger' }[level] as 'neutral' | 'caution' | 'danger';

  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr] md:gap-6">
      <Card className="flex flex-col items-center gap-4 p-6 md:p-8">
        <div className="flex w-full items-center justify-between">
          <p className="eyebrow">Your position if SOL is {fmtUsd(price)}</p>
          {move !== 0 && (
            <button onClick={() => setMove(0)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
              <RotateCcw size={12} /> Today
            </button>
          )}
        </div>
        <HealthGauge ltv={ltv} ghostLtv={move !== 0 ? ltv0 : undefined} maxLtv={SOL.maxLtv} liqLtv={SOL.liqLtv} size="lg" />
        <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3">
          <StatChip label="Collateral" value={fmtUsd(collateral)} delta={`10 SOL × ${fmtUsd(price)}`} />
          <StatChip label="Debt" value={fmtUsd(POS.debt)} delta="USDC, unchanged" />
          <StatChip label="Liquidation price" value={fmtUsd(liqPrice)} tone={tone} delta={`SOL −${Math.abs(liqMovePct)}%`} />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="p-6 md:p-8">
          <div className="flex items-baseline justify-between">
            <label className="text-sm text-ink-2" htmlFor="move">If SOL moves</label>
            <span className={cx('num text-d-sm font-semibold', level === 'safe' ? 'text-ink-1' : level === 'careful' ? 'text-caution' : 'text-danger')}>
              {move > 0 ? '+' : move < 0 ? '−' : '±'}
              {Math.abs(move)}%
            </span>
          </div>
          <div className="mt-6">
            <Scrubber
              label="SOL price change"
              value={move}
              min={-60}
              max={30}
              step={1}
              fill={false}
              onChange={setMove}
              active={state === 'interacting'}
              thumbTone={level === 'safe' ? 'neutral' : level === 'careful' ? 'caution' : 'danger'}
              formatValue={(v) => `${v < 0 ? '−' : v > 0 ? '+' : ''}${Math.abs(v)}%, SOL ${fmtUsd(SOL.price * (1 + v / 100))}`}
              zones={[
                // Same bands as the gauge, expressed as price moves: danger (incl. liquidation) → careful → safe
                { from: -60, to: dangerMovePct, tone: 'danger' },
                { from: dangerMovePct, to: safeMovePct, tone: 'caution' },
                { from: safeMovePct, to: 30, tone: 'safe' },
              ]}
              marks={[
                { value: liqMovePct, label: `Liquidation −${Math.abs(liqMovePct)}%`, tone: 'danger' },
                { value: 0, label: 'Today' },
              ]}
            />
          </div>
          <button
            onClick={() => setMove(Math.round(OCT_2025.drop * 100))}
            className="mt-2 inline-flex items-center gap-2 rounded-xs text-xs font-semibold text-accent"
          >
            <History size={14} /> Replay {OCT_2025.label}
          </button>
        </Card>

        <Explainer level={level} move={move} liqMovePct={liqMovePct} furtherDrop={furtherDrop} sim={sim} survivesOct={survivesOct} state={state} onFix={() => navigate('/position')} />
      </div>
    </div>
  );
}

function Explainer({
  level,
  move,
  liqMovePct,
  furtherDrop,
  sim,
  survivesOct,
  state,
  onFix,
}: {
  level: ReturnType<typeof riskLevel>;
  move: number;
  liqMovePct: number;
  furtherDrop: number;
  sim: ReturnType<typeof simulatePartialLiquidation> | null;
  survivesOct: boolean;
  state: ReviewState;
  onFix: () => void;
}) {
  if (state === 'success' || (move === Math.round(OCT_2025.drop * 100) && survivesOct)) {
    return (
      <Card className="flex gap-3 p-6 ring-safe/40">
        <CircleCheck aria-hidden className="mt-0.5 shrink-0 text-safe" size={20} />
        <div>
          <p className="font-semibold">You’d survive the October 2025 crash</p>
          <p className="mt-1 text-sm text-ink-2">
            After a 14% drop, SOL would still need to fall another {fmtPct(furtherDrop, 0)} before liquidation. Not much — a second leg down of the same size would start it.
          </p>
        </div>
      </Card>
    );
  }
  if (sim) {
    return (
      <Card className="flex flex-col gap-4 p-6 ring-danger/50">
        <div className="flex gap-3">
          <span className="mt-1 text-danger"><RiskGlyph level="liquidatable" size={16} /></span>
          <div>
            <p className="font-semibold">{sim.full ? 'Whole position at risk' : 'Kamino sells a slice, not everything'}</p>
            <p className="mt-1 text-sm text-ink-2">
              {sim.full
                ? 'Above 95% LTV, liquidators may close the whole position in one go.'
                : 'Partial liquidation: about 10% of your debt is repaid from your SOL each round, until you’re back under 80%.'}
            </p>
          </div>
        </div>
        {!sim.full && (
          <dl className="grid grid-cols-3 gap-3 rounded-sm bg-surface-2 p-3 text-center">
            <div><dt className="text-xs text-ink-2">Rounds</dt><dd className="num text-lg font-semibold">≈{sim.rounds}</dd></div>
            <div><dt className="text-xs text-ink-2">SOL sold</dt><dd className="num text-lg font-semibold">{fmtUsd(sim.collateralSoldUsd)}</dd></div>
            <div><dt className="text-xs text-ink-2">Fees lost</dt><dd className="num text-lg font-semibold text-danger">{fmtUsd(sim.feesUsd)}</dd></div>
          </dl>
        )}
        <p className="text-xs text-ink-3">Estimate from Kamino’s in-app numbers (10% per round, ~1% fee). Real fees grow the further past 80% you are.</p>
        <Button icon={LifeBuoy} onClick={onFix}>See ways to avoid this</Button>
      </Card>
    );
  }
  const copy = {
    safe: ['Comfortable', `SOL would have to fall ${Math.abs(liqMovePct)}% from today before any liquidation.`],
    careful: ['Getting thin', `At this price you’re past the safe zone. Another ${fmtPct(furtherDrop, 0)} down starts partial liquidation.`],
    danger: ['One bad hour away', `Under a 10% buffer. A further ${fmtPct(furtherDrop, 0)} drop liquidates part of your position.`],
    liquidatable: ['', ''],
  }[level];
  return (
    <Card className={cx('flex gap-3 p-6', level === 'careful' && 'ring-caution/40', level === 'danger' && 'ring-danger/50')}>
      <span className={cx('mt-1', level === 'safe' ? 'text-safe' : level === 'careful' ? 'text-caution' : 'text-danger')}>
        <RiskGlyph level={level} size={14} />
      </span>
      <div className="flex-1">
        <p className="font-semibold">{copy[0]}</p>
        <p className="mt-1 text-sm text-ink-2">{copy[1]}</p>
        {level !== 'safe' && (
          <Button variant="secondary" size="sm" icon={LifeBuoy} className="mt-3" onClick={onFix}>Add a safety buffer</Button>
        )}
      </div>
      <TokenIcon symbol="sol" size={20} className="hidden md:block" />
    </Card>
  );
}

function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr] md:gap-6" aria-busy>
      <Card className="flex flex-col items-center gap-4 p-8">
        <GaugeSkeleton maxWidth={320} />
        <div className="grid w-full grid-cols-3 gap-3">
          <Shimmer className="h-16 rounded-sm" /><Shimmer className="h-16 rounded-sm" /><Shimmer className="h-16 rounded-sm" />
        </div>
      </Card>
      <Card className="flex flex-col gap-4 p-8">
        <Shimmer className="h-6 w-32 rounded-xs" />
        <Shimmer className="h-2 rounded-full" />
        <Shimmer className="h-24 rounded-sm" />
      </Card>
    </div>
  );
}
