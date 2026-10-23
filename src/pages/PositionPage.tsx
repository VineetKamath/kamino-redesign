import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Bot, LifeBuoy, Plus, Shuffle, ShieldCheck, type LucideIcon } from 'lucide-react';
import { FeatureFrame } from '../components/FeatureFrame';
import { HealthGauge } from '../components/HealthGauge';
import { Scrubber } from '../components/Scrubber';
import { ActionSheet } from '../components/ActionSheet';
import { EmptyState, GaugeSkeleton } from '../components/States';
import { Shimmer } from '../components/AssetRow';
import { Button, Card, RiskBadge, RiskGlyph, StatChip, cx } from '../components/primitives';
import { useToast } from '../components/Toast';
import { useReviewState, type ReviewState } from '../lib/review';
import { levelTone, liquidationPrice, priceDropToLiquidation, riskLevel, safeLimit, type RiskLevel } from '../lib/risk';
import { fmtPct, fmtUsd } from '../lib/format';
import { SOL, USDC } from '../data/kamino';

// DEMO wallet for this feature: 3 spare SOL and 400 USDC outside the position.
const SPARE = { sol: 3, usdc: 400 };
const SWAP_COST = 0.001; // estimate for repay-with-collateral swap; labelled as an estimate in the UI

type Fix = 'add' | 'repay' | 'delever';
interface Pos { sol: number; debt: number }

const PRESET: Record<ReviewState, { pos: Pos; sheet?: boolean; fix?: Fix; fixed?: boolean }> = {
  default: { pos: { sol: 10, debt: 780 } },
  interacting: { pos: { sol: 10, debt: 780 }, sheet: true, fix: 'repay' },
  warning: { pos: { sol: 10, debt: 680 } },
  danger: { pos: { sol: 10, debt: 830 } },
  success: { pos: { sol: 10, debt: 600 }, fixed: true },
  loading: { pos: { sol: 10, debt: 780 } },
  empty: { pos: { sol: 10, debt: 0 } },
};

const ltvOf = (p: Pos) => (p.sol > 0 ? p.debt / (p.sol * SOL.price) : 0);

export function PositionPage() {
  const [state] = useReviewState();
  return (
    <FeatureFrame
      n={5}
      title="“Fix my position”"
      problem="When health drops, Kamino leaves you to work out the fix yourself across separate Supply, Repay and Multiply screens. On-chain, Kamino already supports LTV-triggered auto-deleverage orders — but nothing on wallet-less screens surfaces them."
      evidence={[
        { label: 'klend source: obligation orders (UserLtvAbove → Deleverage)', href: 'https://github.com/Kamino-Finance/klend/blob/master/programs/klend/src/state/obligation_order_operations.rs' },
        { label: 'Kamino Lend V2: “Liquidations are bad UX”', href: 'https://gov.kamino.finance/t/introducing-kamino-lend-v2/58' },
        { label: 'Docs: repay with collateral', href: 'https://kamino.com/docs/products/borrow/borrowing' },
      ]}
      before={[]}
    >
      <Position key={state} state={state} />
    </FeatureFrame>
  );
}

function Position({ state }: { state: ReviewState }) {
  const preset = PRESET[state];
  const [pos, setPos] = useState<Pos>(preset.pos);
  const [prevLtv, setPrevLtv] = useState<number | undefined>(preset.fixed ? ltvOf({ sol: 10, debt: 780 }) : undefined);
  const [sheet, setSheet] = useState(!!preset.sheet);
  const [protect, setProtect] = useState<{ trigger: number; repay: number } | null>(preset.fixed ? { trigger: 0.68, repay: 0.25 } : null);
  const toast = useToast();
  const announced = useRef(false); // StrictMode runs effects twice in dev; announce once

  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    if (state === 'success') toast({ tone: 'success', title: 'Back to Safe', body: 'Repaid $180.00. LTV 75.4% → 58.0%. Auto-protect is on at 68%.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') return <Loading />;
  if (pos.debt === 0) {
    return (
      <Card>
        <EmptyState icon={ShieldCheck} title="Nothing to fix" body="You have 10 SOL supplied and no borrows, so there’s nothing that can be liquidated. Your SOL is earning 4.05% supply APY." action={<Button variant="secondary">Borrow against it</Button>} />
      </Card>
    );
  }

  const ltv = ltvOf(pos);
  const level = riskLevel(ltv, SOL);
  const drop = priceDropToLiquidation(ltv, SOL);
  const collateral = pos.sol * SOL.price;

  const apply = (next: Pos, label: string, rule: { trigger: number; repay: number } | null) => {
    setPrevLtv(ltv);
    setPos(next);
    setProtect(rule);
    setSheet(false);
    const after = ltvOf(next);
    toast({ tone: riskLevel(after, SOL) === 'safe' ? 'success' : 'caution', title: riskLevel(after, SOL) === 'safe' ? 'Back to Safe' : 'Position improved', body: `${label}. LTV ${fmtPct(ltv)} → ${fmtPct(after)}.${rule ? ` Auto-protect on at ${fmtPct(rule.trigger, 0)}.` : ''}` });
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Alert level={level} drop={drop} onFix={() => setSheet(true)} />

      <div className="grid gap-4 md:grid-cols-[1.1fr_1fr] md:gap-6">
        <Card className="flex flex-col items-center gap-4 p-6 md:p-8">
          <div className="flex w-full items-center justify-between">
            <p className="eyebrow">SOL → USDC loan</p>
            <span className="text-xs text-ink-3">SOL {fmtUsd(SOL.price)}</span>
          </div>
          <HealthGauge ltv={ltv} ghostLtv={prevLtv} maxLtv={SOL.maxLtv} liqLtv={SOL.liqLtv} size="lg" caption={prevLtv !== undefined ? `Was ${fmtPct(prevLtv)} before your fix.` : undefined} />
          <div className="grid w-full grid-cols-2 gap-3">
            <StatChip label="Collateral" value={fmtUsd(collateral)} delta={`${pos.sol.toFixed(2)} SOL`} />
            <StatChip label="Debt" value={fmtUsd(pos.debt)} delta={`USDC · ${fmtPct(USDC.borrowApy, 2)} APY`} />
            <StatChip label="Liquidation price" value={fmtUsd(liquidationPrice(SOL.price, ltv, SOL))} tone={level === 'safe' ? 'neutral' : levelTone(level)} delta={level === 'liquidatable' ? 'Already below' : `SOL −${fmtPct(drop, 0)}`} />
            <StatChip label="Spare in wallet" value={`${SPARE.sol} SOL`} delta={`+ ${fmtUsd(SPARE.usdc)} USDC`} />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <ProtectCard rule={protect} pos={pos} onSetup={() => setSheet(true)} onOff={() => setProtect(null)} />
          <Card className="p-6">
            <p className="eyebrow">Why this matters</p>
            <p className="mt-2 text-sm text-ink-2">
              On 10 Oct 2025, SOL fell 14% in under an hour — mostly outside working hours — and ~1,700 Kamino wallets were partially liquidated. A rule that acts while you sleep is the difference.
            </p>
          </Card>
        </div>
      </div>

      <FixSheet open={sheet} onClose={() => setSheet(false)} pos={pos} initialFix={preset.fix} interacting={state === 'interacting'} onApply={apply} />
    </div>
  );
}

function Alert({ level, drop, onFix }: { level: RiskLevel; drop: number; onFix: () => void }) {
  if (level === 'safe') return null;
  const copy: Record<Exclude<RiskLevel, 'safe'>, [string, string]> = {
    careful: ['Your buffer is getting thin', `SOL can fall ${fmtPct(drop, 0)} before liquidation starts.`],
    danger: ['Your position is in danger', `A ${fmtPct(drop, 0)} drop in SOL starts liquidation. That happened in under an hour last October.`],
    liquidatable: ['Liquidation in progress', 'About 10% of your debt is being repaid from your SOL each round. Adding collateral or repaying stops it.'],
  };
  const [title, body] = copy[level];
  const tone = levelTone(level);
  return (
    <div
      role={level === 'careful' ? 'status' : 'alert'}
      className={cx(
        'flex flex-col gap-3 rounded-md p-4 ring-1 ring-inset md:flex-row md:items-center md:p-5',
        tone === 'caution' ? 'bg-caution/10 ring-caution/40' : 'bg-danger/10 ring-danger/50',
      )}
    >
      <span className={cx('flex items-center gap-3', tone === 'caution' ? 'text-caution' : 'text-danger')}>
        <RiskGlyph level={level} size={16} />
        <span className="font-semibold text-ink-1">{title}</span>
      </span>
      <span className="flex-1 text-sm text-ink-2">{body}</span>
      <Button icon={LifeBuoy} variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onFix}>Fix my position</Button>
    </div>
  );
}

function ProtectCard({ rule, pos, onSetup, onOff }: { rule: { trigger: number; repay: number } | null; pos: Pos; onSetup: () => void; onOff: () => void }) {
  if (!rule) {
    return (
      <Card className="flex flex-col gap-3 p-6">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-ink-2" />
          <p className="font-semibold">Auto-protect is off</p>
        </div>
        <p className="text-sm text-ink-2">Set a rule once: if your LTV crosses a line, part of your debt is repaid from collateral automatically — before liquidation, at a far lower cost.</p>
        <Button variant="secondary" className="self-start" onClick={onSetup}>Set up Auto-protect</Button>
      </Card>
    );
  }
  const triggerPrice = pos.debt / (pos.sol * rule.trigger);
  return (
    <Card className="flex flex-col gap-3 p-6 ring-safe/40">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-safe" />
        <p className="font-semibold">Auto-protect is on</p>
      </div>
      <p className="text-sm text-ink-2">
        If LTV passes <span className="num font-semibold text-ink-1">{fmtPct(rule.trigger, 0)}</span> (SOL ≈ <span className="num font-semibold text-ink-1">{fmtUsd(triggerPrice)}</span>), repay <span className="num font-semibold text-ink-1">{fmtPct(rule.repay, 0)}</span> of debt from collateral.
      </p>
      <p className="text-xs text-ink-3">Uses 1 of 2 order slots on this position · you cap the executor’s fee (set here to 0.5% of the amount repaid).</p>
      <Button variant="ghost" size="sm" className="self-start" onClick={onOff}>Turn off</Button>
    </Card>
  );
}

/* ── The sheet: three fixes, each previewed before→after, plus Auto-protect ── */
const FIXES: { id: Fix; icon: LucideIcon; title: string; how: string; trade: string }[] = [
  { id: 'repay', icon: ArrowDownToLine, title: 'Repay debt', how: 'Pay back USDC from your wallet.', trade: 'Fastest way back to safe. Needs USDC.' },
  { id: 'add', icon: Plus, title: 'Add collateral', how: 'Supply more SOL.', trade: 'Keeps your full SOL exposure. Needs spare SOL.' },
  { id: 'delever', icon: Shuffle, title: 'Repay with collateral', how: 'Sell some SOL to repay debt, in one step.', trade: 'No wallet funds needed. You end with less SOL.' },
];

function FixSheet({
  open,
  onClose,
  pos,
  initialFix,
  interacting,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  pos: Pos;
  initialFix?: Fix;
  interacting: boolean;
  onApply: (next: Pos, label: string, rule: { trigger: number; repay: number } | null) => void;
}) {
  const ltv = ltvOf(pos);
  const collateral = pos.sol * SOL.price;
  // Defaults: the smallest amount that gets back to Safe, capped by what's available.
  const target = safeLimit(SOL) - 0.02;
  const defaults: Record<Fix, number> = {
    repay: Math.min(SPARE.usdc, Math.ceil((pos.debt - collateral * target) / 10) * 10),
    add: Math.min(SPARE.sol, Math.ceil((pos.debt / target / SOL.price - pos.sol) * 4) / 4),
    delever: Math.min(pos.sol * 0.6, Math.ceil(((pos.debt - target * collateral) / (1 - target) / SOL.price) * 4) / 4),
  };
  const [fix, setFix] = useState<Fix>(initialFix ?? 'repay');
  const [amt, setAmt] = useState<Record<Fix, number>>(defaults);
  const [rule, setRule] = useState({ on: true, trigger: 0.68, repay: 0.25 });

  const after = (f: Fix): Pos => {
    const a = amt[f];
    if (f === 'repay') return { sol: pos.sol, debt: Math.max(0, pos.debt - a) };
    if (f === 'add') return { sol: pos.sol + a, debt: pos.debt };
    const usd = a * SOL.price;
    return { sol: pos.sol - a, debt: Math.max(0, pos.debt - usd * (1 - SWAP_COST)) };
  };
  const next = after(fix);
  const nextLtv = ltvOf(next);
  const label = fix === 'repay' ? `Repaid ${fmtUsd(amt.repay)}` : fix === 'add' ? `Added ${amt.add} SOL` : `Sold ${amt.delever} SOL to repay`;
  const triggerPrice = next.debt / (next.sol * rule.trigger);

  return (
    <ActionSheet open={open} onClose={onClose} title="Fix my position" description={`You’re at ${fmtPct(ltv)} LTV. Pick a fix — each shows where you’ll land before you commit.`}>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Choose a fix" className="flex flex-col gap-2">
          {FIXES.map((f) => {
            const p = after(f.id);
            const l = ltvOf(p);
            const lvl = riskLevel(l, SOL);
            const selected = fix === f.id;
            return (
              <button
                key={f.id}
                aria-pressed={selected}
                onClick={() => setFix(f.id)}
                className={cx(
                  'flex items-center gap-3 rounded-sm p-3 text-left ring-1 ring-inset transition duration-fast',
                  selected ? 'bg-surface-2 ring-accent' : 'bg-surface-1 ring-line hover:bg-surface-2',
                )}
              >
                <div className="w-[88px] shrink-0">
                  <HealthGauge ltv={l} ghostLtv={ltv} maxLtv={SOL.maxLtv} liqLtv={SOL.liqLtv} size="sm" showLegend={false} showReadout={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold"><f.icon size={14} className="text-ink-2" />{f.title}</p>
                  <p className="text-xs text-ink-2">{f.how}</p>
                  <p className="num mt-1 flex items-center gap-2 text-xs">
                    <span className="text-ink-3">{fmtPct(ltv)} →</span>
                    <span className="font-semibold">{fmtPct(l)}</span>
                    <RiskBadge level={lvl} size="sm" />
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-sm bg-surface-2 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-ink-2">{fix === 'repay' ? 'Repay amount' : fix === 'add' ? 'SOL to add' : 'SOL to sell'}</span>
            <span className="num text-base font-semibold">{fix === 'repay' ? fmtUsd(amt.repay) : `${amt[fix]} SOL`}</span>
          </div>
          <Scrubber
            label={fix === 'repay' ? 'Repay amount' : 'SOL amount'}
            value={amt[fix]}
            min={0}
            max={fix === 'repay' ? SPARE.usdc : fix === 'add' ? SPARE.sol : Math.floor(pos.sol * 0.6)}
            step={fix === 'repay' ? 10 : 0.25}
            onChange={(v) => setAmt((a) => ({ ...a, [fix]: v }))}
            active={interacting}
            thumbTone={levelTone(riskLevel(nextLtv, SOL))}
            formatValue={(v) => (fix === 'repay' ? fmtUsd(v) : `${v} SOL`)}
          />
          <p className="text-xs text-ink-2">
            {FIXES.find((f) => f.id === fix)!.trade}
            {fix === 'delever' && ` Swap cost ≈ ${fmtUsd(amt.delever * SOL.price * SWAP_COST)} (est.).`}
          </p>
        </div>

        {/* Auto-protect: maps to klend obligation order UserLtvAbove → DeleverageSingleDebtAmount */}
        <div className="rounded-sm p-4 ring-1 ring-inset ring-line">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={rule.on} onChange={(e) => setRule((r) => ({ ...r, on: e.target.checked }))} className="size-4 accent-[rgb(var(--accent))]" />
            <span className="flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold"><Bot size={14} /> Also turn on Auto-protect</span>
              <span className="text-xs text-ink-2">So this doesn’t happen again while you’re away.</span>
            </span>
          </label>
          {rule.on && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-xs"><span className="text-ink-2">When LTV passes</span><span className="num font-semibold">{fmtPct(rule.trigger, 0)}</span></div>
                <Scrubber label="Trigger LTV" value={rule.trigger} min={0.6} max={0.74} step={0.01} onChange={(v) => setRule((r) => ({ ...r, trigger: v }))} formatValue={(v) => fmtPct(v, 0)} fill={false} />
              </div>
              <div>
                <div className="flex justify-between text-xs"><span className="text-ink-2">Repay this much of the debt</span><span className="num font-semibold">{fmtPct(rule.repay, 0)}</span></div>
                <Scrubber label="Repay share" value={rule.repay} min={0.1} max={0.5} step={0.05} onChange={(v) => setRule((r) => ({ ...r, repay: v }))} formatValue={(v) => fmtPct(v, 0)} />
              </div>
              <p className="num text-xs text-ink-2">
                Fires if SOL falls to ≈ <span className="font-semibold text-ink-1">{fmtUsd(triggerPrice)}</span> ({fmtPct(1 - triggerPrice / SOL.price, 0)} below today). A keeper bot runs it; you cap its fee — we suggest 0.5% of the amount repaid.
              </p>
            </div>
          )}
        </div>

        <Button size="lg" onClick={() => onApply(next, label, rule.on ? { trigger: rule.trigger, repay: rule.repay } : null)}>
          {label} · land at {fmtPct(nextLtv)}
        </Button>
        <p className="-mt-1 text-center text-xs text-ink-3">Demo only — no transaction is sent.</p>
      </div>
    </ActionSheet>
  );
}

function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr] md:gap-6" aria-busy>
      <Card className="flex flex-col items-center gap-4 p-8">
        <GaugeSkeleton maxWidth={320} />
        <div className="grid w-full grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => <Shimmer key={i} className="h-16 rounded-sm" />)}
        </div>
      </Card>
      <Card className="flex flex-col gap-3 p-6">
        <Shimmer className="h-4 w-32 rounded-xs" />
        <Shimmer className="h-16 rounded-sm" />
        <Shimmer className="h-10 w-40 rounded-sm" />
      </Card>
    </div>
  );
}
