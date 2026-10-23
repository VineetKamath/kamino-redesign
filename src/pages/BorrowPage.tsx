import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CircleCheck, Info, Minus, Plus } from 'lucide-react';
import { FeatureFrame } from '../components/FeatureFrame';
import { HealthGauge } from '../components/HealthGauge';
import { Scrubber } from '../components/Scrubber';
import { EmptyState, GaugeSkeleton } from '../components/States';
import { Shimmer } from '../components/AssetRow';
import { Button, Card, StatChip, TokenIcon, cx } from '../components/primitives';
import { useToast } from '../components/Toast';
import { useReviewState, type ReviewState } from '../lib/review';
import { levelTone, liquidationPrice, priceDropToLiquidation, riskLevel, riskZones, safeBorrowHeadroom, safeLimit } from '../lib/risk';
import { fmtPct, fmtUsd } from '../lib/format';
import { DEMO_WALLET, SOL, USDC } from '../data/kamino';

// Each review state is a concrete, reproducible scenario on the same demo position.
const PRESET: Record<ReviewState, { sol: number; borrow: number }> = {
  default: { sol: 10, borrow: 300 },
  interacting: { sol: 10, borrow: 520 },
  warning: { sol: 10, borrow: 700 },
  danger: { sol: 10, borrow: 790 },
  success: { sol: 10, borrow: 300 },
  loading: { sol: 10, borrow: 300 },
  empty: { sol: 0, borrow: 0 },
};

export function BorrowPage() {
  const [state] = useReviewState();
  return (
    <FeatureFrame
      n={1}
      title="Borrow health gauge"
      problem="Today the borrow form shows “Liquidation LTV 80%” as a bare number — and with no collateral, a green “LTV 0.00%”. A new user can’t tell how close to liquidation a borrow puts them."
      evidence={[
        { label: 'Kamino docs: “the buffer that actually matters”', href: 'https://kamino.com/docs/products/borrow/concepts' },
      ]}
      before={[
        { desktop: 'sol-borrow-modal-typed-desktop.webp', caption: 'Borrow 500 SOL with zero collateral: “Loan-To-Value 0.00%” shown in green' },
        { desktop: 'reserve-sol-desktop.webp', mobile: 'reserve-sol-mobile.webp', caption: 'SOL reserve: Max LTV and Liq. LTV as equal-weight stat tiles' },
      ]}
    >
      <BorrowFlow key={state} state={state} />
    </FeatureFrame>
  );
}

function BorrowFlow({ state }: { state: ReviewState }) {
  const [sol, setSol] = useState(PRESET[state].sol);
  const [borrow, setBorrow] = useState(PRESET[state].borrow);
  const [done, setDone] = useState(state === 'success');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const announced = useRef(false); // StrictMode runs effects twice in dev; announce once

  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    if (state === 'success') toast({ tone: 'success', title: 'Borrowed $300.00 USDC', body: 'Your position is Safe. SOL can fall 64% before liquidation.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collateral = sol * SOL.price;
  const ltv = collateral > 0 ? borrow / collateral : 0;
  const level = riskLevel(ltv, SOL);
  const limit = collateral * SOL.maxLtv; // USDC borrow factor = 1, so capacity = collateral × Max LTV
  const headroom = safeBorrowHeadroom(collateral, borrow, SOL);
  const drop = priceDropToLiquidation(ltv, SOL);
  const overLimit = borrow > limit;
  const sl = safeLimit(SOL);

  if (state === 'loading') return <Loading />;

  const sentence =
    collateral === 0
      ? ''
      : level === 'safe'
        ? `You can borrow ${fmtUsd(headroom)} more and stay safe.`
        : level === 'careful'
          ? `Past the safe zone — SOL can only fall ${fmtPct(drop, 0)} before liquidation.`
          : overLimit
            ? `Over Kamino’s borrow limit. The most you can borrow is ${fmtUsd(limit)}.`
            : `Kamino allows this, but a ${fmtPct(drop, 0)} SOL drop would start liquidation.`;

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      toast({ tone: 'success', title: `Borrowed ${fmtUsd(borrow)} USDC`, body: `Your position is ${level === 'safe' ? 'Safe' : 'Careful'}. SOL can fall ${fmtPct(drop, 0)} before liquidation.` });
    }, 1200);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.1fr] md:gap-6">
      {/* Gauge first on mobile: it's the answer to "is this safe?" */}
      <Card className="order-1 flex flex-col items-center gap-4 p-6 md:order-2 md:p-8">
        <div className="flex w-full items-center justify-between">
          <p className="eyebrow">{done ? 'Your position' : 'After this borrow'}</p>
          <span className="text-xs text-ink-3">SOL {fmtUsd(SOL.price)}</span>
        </div>
        {collateral === 0 ? (
          <EmptyState
            title="Add collateral first"
            body="Borrowing on Kamino is always backed by something you deposit. Supply SOL and the gauge shows how much you can safely borrow against it."
            action={<Button icon={Plus} onClick={() => setSol(10)}>Use 10 SOL as collateral</Button>}
          />
        ) : (
          <>
            <HealthGauge ltv={ltv} maxLtv={SOL.maxLtv} liqLtv={SOL.liqLtv} size="lg" caption={sentence} />
            <div className="grid w-full grid-cols-2 gap-3">
              <StatChip label="Liquidation price" value={ltv > 0 ? fmtUsd(liquidationPrice(SOL.price, ltv, SOL)) : '—'} tone={level === 'safe' ? 'neutral' : levelTone(level)} delta={ltv > 0 ? `SOL −${fmtPct(drop, 0)} from today` : 'No debt yet'} />
              <StatChip label="Interest" value={`${fmtUsd((borrow * USDC.borrowApy) / 12)}/mo`} delta={`${fmtPct(USDC.borrowApy, 2)} variable APY`} />
            </div>
          </>
        )}
      </Card>

      <Card className="order-2 flex flex-col gap-6 p-6 md:order-1 md:p-8">
        {done ? (
          <Success borrow={borrow} onAgain={() => setDone(false)} />
        ) : (
          <>
            <div>
              <h2 className="text-d-sm font-semibold">Borrow USDC</h2>
              <p className="mt-1 text-sm text-ink-2">Against SOL in Kamino’s main market.</p>
            </div>

            {/* Step 1: collateral */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-ink-2">1 · Collateral</span>
              <div className="flex items-center gap-3 rounded-sm bg-surface-2 p-3 ring-1 ring-inset ring-line">
                <TokenIcon symbol="sol" size={32} />
                <div className="flex-1">
                  <p className="num text-base font-semibold">{sol} SOL</p>
                  <p className="num text-xs text-ink-2">{fmtUsd(collateral)} · wallet {DEMO_WALLET.sol} SOL</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="secondary" size="sm" aria-label="Less SOL" onClick={() => setSol((s) => Math.max(0, s - 1))} disabled={sol === 0}>
                    <Minus size={14} />
                  </Button>
                  <Button variant="secondary" size="sm" aria-label="More SOL" onClick={() => setSol((s) => Math.min(DEMO_WALLET.sol, s + 1))} disabled={sol >= DEMO_WALLET.sol}>
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: amount — only once there's collateral to borrow against */}
            {collateral === 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-ink-2">2 · Amount</span>
                <p className="rounded-sm bg-surface-2 p-3 text-sm text-ink-2 ring-1 ring-inset ring-line">Add SOL above first — then choose how much USDC to borrow.</p>
              </div>
            ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="borrow-amt" className="text-xs font-semibold text-ink-2">2 · Amount</label>
                <button className="text-xs font-semibold text-accent disabled:text-ink-3" disabled={collateral === 0} onClick={() => setBorrow(Math.floor(collateral * sl))}>
                  Max safe · {fmtUsd(Math.floor(collateral * sl))}
                </button>
              </div>
              <div className={cx('flex items-center gap-3 rounded-sm bg-surface-2 p-3 ring-1 ring-inset', overLimit ? 'ring-danger' : 'ring-line focus-within:ring-accent')}>
                <TokenIcon symbol="usdc" size={32} />
                <input
                  id="borrow-amt"
                  inputMode="decimal"
                  value={borrow}
                  onChange={(e) => setBorrow(Math.max(0, Number(e.target.value.replace(/[^\d.]/g, '')) || 0))}
                  className="num w-full bg-transparent text-d-sm font-semibold outline-none"
                  aria-describedby="borrow-hint"
                />
                <span className="text-sm font-semibold text-ink-2">USDC</span>
              </div>
              <Scrubber
                label="Borrow amount"
                value={Math.min(borrow, collateral * 0.85)}
                min={0}
                max={Math.max(1, Math.round(collateral * 0.85))}
                step={5}
                onChange={setBorrow}
                active={state === 'interacting'}
                thumbTone={levelTone(level)}
                formatValue={(v) => `${fmtUsd(v)}, ${fmtPct(collateral ? v / collateral : 0)} LTV`}
                zones={riskZones(SOL).map((z) => ({ from: collateral * z.from, to: collateral * z.to, tone: levelTone(z.level) }))}
                marks={collateral > 0 ? [{ value: limit, label: `Limit ${fmtUsd(limit, false)}` }] : []}
              />
              <p id="borrow-hint" className={cx('flex items-start gap-2 text-xs', overLimit ? 'text-danger' : 'text-ink-2')}>
                <Info aria-hidden size={14} className="mt-px shrink-0" />
                {overLimit
                  ? `Kamino caps new borrows at 74% of collateral (${fmtUsd(limit)}). Reduce the amount or add SOL.`
                  : level === 'danger'
                    ? 'Allowed, but inside the red zone: under a 10% price buffer.'
                    : 'Teal is our suggested zone: SOL could fall 25%+ and you’d still be fine.'}
              </p>
            </div>
            )}

            <Button size="lg" icon={overLimit ? undefined : ArrowRight} disabled={overLimit || borrow <= 0 || collateral === 0} loading={submitting} onClick={submit}>
              {overLimit ? 'Over borrow limit' : submitting ? 'Confirming…' : `Borrow ${fmtUsd(borrow)}`}
            </Button>
            <p className="-mt-3 text-center text-xs text-ink-3">Demo only — no transaction is sent.</p>
          </>
        )}
      </Card>
    </div>
  );
}

function Success({ borrow, onAgain }: { borrow: number; onAgain: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-safe/10 text-safe">
        <CircleCheck size={24} />
      </span>
      <div>
        <h2 className="text-d-sm font-semibold">{fmtUsd(borrow)} USDC borrowed</h2>
        <p className="mx-auto mt-1 max-w-[34ch] text-sm text-ink-2">The gauge now lives on your Position page. We’ll tell you if SOL moves you out of the safe zone.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onAgain}>Borrow more</Button>
        <Button variant="ghost" onClick={() => navigate('/what-if')}>What if SOL drops?</Button>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.1fr] md:gap-6" aria-busy>
      <Card className="order-1 flex flex-col items-center gap-4 p-8 md:order-2">
        <GaugeSkeleton maxWidth={320} />
        <div className="grid w-full grid-cols-2 gap-3">
          <Shimmer className="h-16 rounded-sm" />
          <Shimmer className="h-16 rounded-sm" />
        </div>
      </Card>
      <Card className="order-2 flex flex-col gap-6 p-8 md:order-1">
        <Shimmer className="h-6 w-40 rounded-xs" />
        <Shimmer className="h-16 rounded-sm" />
        <Shimmer className="h-16 rounded-sm" />
        <Shimmer className="h-2 rounded-full" />
        <Shimmer className="h-12 rounded-sm" />
      </Card>
    </div>
  );
}
