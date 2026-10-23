import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronDown, CircleCheck, Info, Search, SearchX } from 'lucide-react';
import { FeatureFrame } from '../components/FeatureFrame';
import { EmptyState } from '../components/States';
import { Shimmer } from '../components/AssetRow';
import { Button, Card, RiskGlyph, Segmented, TokenIcon, TokenPair, cx } from '../components/primitives';
import { useToast } from '../components/Toast';
import { useReviewState, type ReviewState } from '../lib/review';
import type { RiskLevel } from '../lib/risk';
import { fmtSignedPct, fmtUsd, fmtUsdCompact } from '../lib/format';
import { INTENTS, VAULTS, type Intent, type Vault, type VaultRisk } from '../data/kamino';

const DEPOSIT = 1000;
const earn30 = (apy: number) => (DEPOSIT * apy * 30) / 365;

// Vault risk reuses the same shapes/colours as position risk: it IS risk, just a different kind.
const VRISK: Record<VaultRisk, { level: RiskLevel; cls: string }> = {
  Conservative: { level: 'safe', cls: 'text-safe bg-safe/10' },
  Balanced: { level: 'careful', cls: 'text-caution bg-caution/10' },
  Aggressive: { level: 'danger', cls: 'text-danger bg-danger/10' },
};

const PRESET: Record<ReviewState, { intent: Intent | 'all'; open?: string; query?: string; view?: 'cards' | 'table' }> = {
  default: { intent: 'all' },
  interacting: { intent: 'all', open: 'm-jitosol' },
  warning: { intent: 'lp', open: 'lp-usdg-usdc' },
  danger: { intent: 'sol', open: 'm-sol-usdc' },
  success: { intent: 'stable', open: 'steak-usdc' },
  loading: { intent: 'all' },
  empty: { intent: 'all', query: 'BONK' },
};

export function DiscoverPage() {
  const [state] = useReviewState();
  return (
    <FeatureFrame
      n={4}
      title="Vault discovery cards"
      problem="Choosing where to earn means reading three dense tables across three tabs (Earn, Multiply, Liquidity), sorted by APY. Liquidity vaults show no risk at all, and rows like “0.00% APY · $2.6M TVL” go unexplained."
      evidence={[{ label: 'Kamino Liquidity page (live)', href: 'https://kamino.com/liquidity' }, { label: 'Kamino Earn page (live)', href: 'https://kamino.com/earn/lend' }]}
      before={[
        { desktop: 'earn-lend-overview-desktop.webp', mobile: 'earn-lend-overview-mobile.webp', caption: 'Earn: 33 vaults in one table' },
        { desktop: 'liquidity-list-desktop.webp', mobile: 'liquidity-list-mobile.webp', caption: 'Liquidity: no risk column, 0.00% rows unexplained' },
      ]}
    >
      <Discover key={state} state={state} />
    </FeatureFrame>
  );
}

function Discover({ state }: { state: ReviewState }) {
  const p = PRESET[state];
  const [intent, setIntent] = useState<Intent | 'all'>(p.intent);
  const [open, setOpen] = useState<string | undefined>(p.open);
  const [query, setQuery] = useState(p.query ?? '');
  const [view, setView] = useState<'cards' | 'table'>(p.view ?? 'cards');
  const [deposited, setDeposited] = useState<string | undefined>(state === 'success' ? 'steak-usdc' : undefined);
  const toast = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VAULTS.filter((v) => (intent === 'all' || v.intent === intent) && (!q || `${v.name} ${v.curator} ${v.tokens.join(' ')}`.toLowerCase().includes(q)));
  }, [intent, query]);

  const deposit = (v: Vault) => {
    setDeposited(v.id);
    toast({ tone: 'success', title: `${fmtUsd(DEPOSIT)} into ${v.name}`, body: `≈ ${fmtUsd(earn30(v.apy))} in 30 days if the APY holds. Demo only.` });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div className="flex w-max gap-2" role="group" aria-label="What do you want to do?">
            {(['all', 'stable', 'sol', 'lp'] as const).map((k) => (
              <button
                key={k}
                aria-pressed={intent === k}
                onClick={() => setIntent(k)}
                className={cx(
                  'h-10 rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition duration-fast',
                  intent === k ? 'bg-ink-1 text-canvas ring-ink-1' : 'bg-surface-1 text-ink-2 ring-line hover:text-ink-1',
                )}
              >
                {k === 'all' ? 'Everything' : INTENTS[k].title}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-sm bg-surface-1 px-3 ring-1 ring-inset ring-line focus-within:ring-accent md:w-[220px] md:flex-none">
            <Search aria-hidden size={16} className="text-ink-3" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vaults" aria-label="Search vaults" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3" />
          </label>
          <Segmented label="Layout" value={view} onChange={setView} options={[{ value: 'cards', label: 'Cards' }, { value: 'table', label: 'Table' }]} />
        </div>
      </div>

      {state === 'loading' ? (
        <LoadingCards />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title={`No vaults match “${query}”`} body="Kamino doesn’t list a vault for that token yet. Try a stablecoin or SOL, or browse by goal instead." action={<Button variant="secondary" onClick={() => setQuery('')}>Clear search</Button>} />
        </Card>
      ) : view === 'table' ? (
        <VaultTable vaults={filtered} />
      ) : (
        (Object.keys(INTENTS) as Intent[])
          .filter((k) => filtered.some((v) => v.intent === k))
          .map((k) => (
            <section key={k} aria-labelledby={`g-${k}`} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h2 id={`g-${k}`} className="text-d-sm font-semibold">{INTENTS[k].title}</h2>
                  <p className="text-sm text-ink-2">{INTENTS[k].blurb}</p>
                </div>
                <span className="num shrink-0 text-xs text-ink-3">{filtered.filter((v) => v.intent === k).length} vaults</span>
              </div>
              {/* Swipe on phones (snap), grid on desktop */}
              <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:items-stretch md:overflow-visible md:px-0">
                {filtered
                  .filter((v) => v.intent === k)
                  // A card opened by the review state leads its row, so it's visible on phones without swiping.
                  .sort((a, b) => Number(b.id === p.open) - Number(a.id === p.open))
                  .map((v) => (
                    <VaultCard key={v.id} v={v} open={open === v.id} onToggle={() => setOpen(open === v.id ? undefined : v.id)} deposited={deposited === v.id} onDeposit={() => deposit(v)} />
                  ))}
              </div>
            </section>
          ))
      )}
      <p className="text-xs text-ink-3">
        APYs as listed on kamino.com, 23 Oct 2026 (Multiply at the leverage noted). “30-day preview” = $1,000 × APY × 30/365, assuming the rate holds — it won’t exactly.
        Risk labels marked “Kamino” are Kamino’s own vault profiles; “est.” labels are our hypothesis, since Kamino shows none for those products.
      </p>
    </div>
  );
}

function RiskChip({ v }: { v: Vault }) {
  const r = VRISK[v.risk];
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', r.cls)} title={v.riskIsKamino ? 'Kamino vault profile' : 'Our estimate — Kamino shows no risk rating for this product'}>
      <RiskGlyph level={r.level} size={9} />
      {v.risk}
      <span className="font-normal">· {v.riskIsKamino ? 'Kamino' : 'est.'}</span>
    </span>
  );
}

function VaultCard({ v, open, onToggle, deposited, onDeposit }: { v: Vault; open: boolean; onToggle: () => void; deposited: boolean; onDeposit: () => void }) {
  const reduce = useReducedMotion();
  const e30 = earn30(v.apy);
  const negative = v.apy < 0;
  return (
    <motion.article
      layout={!reduce}
      className={cx(
        'flex w-[86%] shrink-0 snap-start flex-col gap-4 rounded-md bg-surface-1 p-5 shadow-e1 ring-1 ring-inset md:w-auto',
        open ? 'ring-accent/60' : 'ring-line',
      )}
    >
      <header className="flex items-start gap-3">
        {v.tokens.length === 2 ? <TokenPair a={v.tokens[0]} b={v.tokens[1]} size={28} /> : <TokenIcon symbol={v.tokens[0]} size={28} />}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <h3 className="font-ui text-sm font-semibold leading-tight">{v.name}</h3>
          <p className="text-xs text-ink-2">{v.product} · {v.curator}</p>
          <RiskChip v={v} />
        </div>
      </header>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={cx('num text-d-md font-semibold leading-none', negative && 'text-danger')}>{fmtSignedPct(v.apy)}</p>
          <p className="mt-1 text-xs text-ink-2">APY{v.atLeverage ? ` at ${v.atLeverage}× (max)` : v.product === 'Liquidity' ? ' · 7-day fees' : ''}</p>
        </div>
        <div className="text-right">
          <p className={cx('num text-base font-semibold', negative ? 'text-danger' : 'text-ink-1')}>{negative ? '−' : '+'}{fmtUsd(Math.abs(e30))}</p>
          <p className="text-xs text-ink-2">on $1,000 · 30 days</p>
        </div>
      </div>

      <p className="text-sm text-ink-2">{v.source}</p>
      {v.note && (
        <p className={cx('flex gap-2 rounded-sm px-3 py-2 text-xs', negative ? 'bg-danger/10 text-danger' : 'bg-caution/10 text-caution')}>
          <Info aria-hidden size={14} className="mt-px shrink-0" />
          {v.note}
        </p>
      )}

      {open && (
        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
          <div><dt className="text-ink-3">Deposits</dt><dd className="num mt-0.5 text-sm font-semibold">{fmtUsdCompact(v.tvl)}</dd></div>
          <div><dt className="text-ink-3">Can you be liquidated?</dt><dd className="mt-0.5 text-sm font-semibold">{v.product === 'Multiply' ? 'Yes' : 'No'}</dd></div>
          <div className="col-span-2"><dt className="text-ink-3">Main risk</dt><dd className="mt-0.5 text-sm">{mainRisk(v)}</dd></div>
        </dl>
      )}

      <div className="mt-auto flex items-center gap-2">
        {deposited ? (
          <span className="flex flex-1 items-center gap-2 text-sm font-semibold text-safe"><CircleCheck size={16} /> {fmtUsd(DEPOSIT)} deposited</span>
        ) : (
          <Button size="sm" className="flex-1" icon={ArrowRight} onClick={onDeposit} variant={negative ? 'secondary' : 'primary'}>
            {v.product === 'Multiply' ? 'Set up' : 'Deposit'}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onToggle} aria-expanded={open}>
          {open ? 'Less' : 'Details'} <ChevronDown size={14} className={cx('transition', open && 'rotate-180')} />
        </Button>
      </div>
    </motion.article>
  );
}

function mainRisk(v: Vault) {
  if (v.product === 'Earn') return 'Borrowers in the markets this vault lends to fail to repay, or a stablecoin loses its peg. Withdrawals can be delayed when those markets are fully borrowed.';
  if (v.product === 'Liquidity') return v.tokens.includes('sol') ? 'Impermanent loss if the two tokens’ prices drift apart; fees can drop to zero when volume dries up.' : 'One stablecoin losing its peg; fees fall to zero when trading volume dries up.';
  return v.id === 'm-sol-usdc' ? 'SOL price: a ~8% drop at max leverage starts liquidation.' : 'SOL borrow rate rising above the staking yield for a long time.';
}

function VaultTable({ vaults }: { vaults: Vault[] }) {
  const [sort, setSort] = useState<'apy' | 'tvl'>('apy');
  const rows = [...vaults].sort((a, b) => b[sort] - a[sort]);
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs text-ink-2">
          <tr className="border-b border-line">
            <th className="px-4 py-3 font-medium">Vault</th>
            <th className="px-4 py-3 font-medium">Goal</th>
            <th className="px-4 py-3 text-right font-medium"><button onClick={() => setSort('apy')} className={cx(sort === 'apy' && 'text-ink-1')}>APY {sort === 'apy' && '↓'}</button></th>
            <th className="px-4 py-3 text-right font-medium">30d on $1k</th>
            <th className="px-4 py-3 text-right font-medium"><button onClick={() => setSort('tvl')} className={cx(sort === 'tvl' && 'text-ink-1')}>Deposits {sort === 'tvl' && '↓'}</button></th>
            <th className="px-4 py-3 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.id} className="border-b border-line last:border-0 hover:bg-surface-2">
              <td className="px-4 py-3"><span className="flex items-center gap-2 font-semibold">{v.tokens.length === 2 ? <TokenPair a={v.tokens[0]} b={v.tokens[1]} size={20} /> : <TokenIcon symbol={v.tokens[0]} size={20} />}{v.name}</span></td>
              <td className="px-4 py-3 text-ink-2">{INTENTS[v.intent].title}</td>
              <td className={cx('num px-4 py-3 text-right font-semibold', v.apy < 0 && 'text-danger')}>{fmtSignedPct(v.apy)}</td>
              <td className={cx('num px-4 py-3 text-right', v.apy < 0 ? 'text-danger' : 'text-ink-2')}>{v.apy < 0 ? '−' : '+'}{fmtUsd(Math.abs(earn30(v.apy)))}</td>
              <td className="num px-4 py-3 text-right text-ink-2">{fmtUsdCompact(v.tvl)}</td>
              <td className="px-4 py-3"><RiskChip v={v} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-3 md:grid-cols-3" aria-busy>
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3"><Shimmer className="size-8 rounded-full" /><Shimmer className="h-3 w-32 rounded-xs" /></div>
          <Shimmer className="h-8 w-24 rounded-xs" />
          <Shimmer className="h-3 rounded-xs" />
          <Shimmer className="h-8 rounded-sm" />
        </Card>
      ))}
    </div>
  );
}
