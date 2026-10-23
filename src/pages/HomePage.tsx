import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Images } from 'lucide-react';
import { FEATURES } from '../components/AppShell';
import { HealthGauge } from '../components/HealthGauge';
import { Scrubber } from '../components/Scrubber';
import { Card } from '../components/primitives';
import { levelTone, priceDropToLiquidation, riskLevel, riskZones } from '../lib/risk';
import { fmtPct, fmtUsd } from '../lib/format';
import { SNAPSHOT_DATE, SOL } from '../data/kamino';

// Each feature: the problem in Kamino today → what changes. Copy mirrors research/feature-specs.md.
const STORY: Record<string, [string, string]> = {
  '/borrow': ['The borrow form shows “Liquidation LTV 80%” and, with no collateral, a green “LTV 0.00%”.', 'A gauge that shows where you are, your limit and the breaking point — before you borrow.'],
  '/what-if': ['There’s no way to rehearse a crash. Partial liquidation is explained in a hover tooltip.', 'Drag SOL’s price, replay October 2025, and see exactly what would be sold.'],
  '/multiply': ['“3×” comes with an APY, but no liquidation price and no hint of which risk you’re taking.', 'See the loop, the risk that matters for this strategy, and that more leverage can earn less.'],
  '/discover': ['Three dense tables across three tabs, sorted by APY. Liquidity vaults show no risk at all.', 'Cards grouped by goal, with a 30-day preview on $1,000 and a plain-language risk.'],
  '/position': ['When health drops, the fixes are spread across separate screens.', 'Three fixes previewed side by side, plus Auto-protect built on Kamino’s own on-chain orders.'],
};

export function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Evidence />
      <section aria-labelledby="features-h" className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-12 md:px-8 md:py-20">
        <div className="max-w-[60ch]">
          <p className="eyebrow">Five changes</p>
          <h2 id="features-h" className="mt-2 text-d-md font-semibold md:text-d-lg">Each starts from a real problem.</h2>
          <p className="mt-3 text-base text-ink-2">Every screen has a <span className="font-semibold text-ink-1">Kamino today</span> toggle showing the real, unedited screenshot — and a state bar to walk through default, warning, danger, success, loading and empty.</p>
        </div>
        <ol className="grid gap-3 md:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.to} className={f.n === 5 ? 'md:col-span-2' : undefined}>
              <Link to={f.to} className="group block h-full rounded-md">
                <Card className="flex h-full flex-col gap-4 p-6 transition duration-fast group-hover:bg-surface-2">
                  <div className="flex items-center gap-3">
                    <span className="num grid size-8 place-items-center rounded-full bg-surface-3 text-xs font-semibold">{f.n}</span>
                    <h3 className="flex-1 font-ui text-lg font-semibold">{f.label}</h3>
                    <ArrowRight aria-hidden size={18} className="text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  <dl className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <dt className="eyebrow">Today</dt>
                      <dd className="mt-1 text-ink-2">{STORY[f.to][0]}</dd>
                    </div>
                    <div>
                      <dt className="text-micro font-semibold uppercase tracking-[0.08em] text-accent">Redesign</dt>
                      <dd className="mt-1">{STORY[f.to][1]}</dd>
                    </div>
                  </dl>
                </Card>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <Method />
    </div>
  );
}

function Hero() {
  // Live demo: 10 SOL collateral, drag the borrow.
  const collateral = 10 * SOL.price;
  const [debt, setDebt] = useState(420);
  const ltv = debt / collateral;
  const level = riskLevel(ltv, SOL);
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-content items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:px-8 md:py-20">
        <div>
          <p className="eyebrow">Concept redesign · Kamino Finance</p>
          <h1 className="mt-3 text-d-lg font-semibold md:text-d-xl">Know how close you are to liquidation — before it happens.</h1>
          <p className="mt-5 max-w-[52ch] text-base text-ink-2 md:text-lg">
            Kamino is one of Solana’s largest lending protocols, and its liquidations are designed to be forgiving. Its interface just doesn’t show it. This concept keeps Kamino’s look and spends colour on one thing: your distance from liquidation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/borrow" className="inline-flex h-12 items-center gap-2 rounded-sm bg-accent px-6 font-semibold text-accent-ink transition hover:brightness-110">
              Start with the gauge <ArrowRight size={18} />
            </Link>
            <Link to="/system" className="inline-flex h-12 items-center gap-2 rounded-sm bg-surface-2 px-6 font-semibold ring-1 ring-inset ring-line transition hover:bg-surface-3">
              Design system
            </Link>
          </div>
        </div>
        <Card className="flex flex-col items-center gap-5 p-6 md:p-8">
          <p className="eyebrow self-start">Try it · 10 SOL as collateral</p>
          <HealthGauge
            ltv={ltv}
            maxLtv={SOL.maxLtv}
            liqLtv={SOL.liqLtv}
            size="md"
            showLegend={false}
            caption={level === 'liquidatable' ? 'Past liquidation.' : `Borrowing ${fmtUsd(debt)}: SOL can fall ${fmtPct(priceDropToLiquidation(ltv, SOL), 0)} before liquidation.`}
          />
          <div className="w-full">
            <Scrubber
              label="Borrow amount"
              value={debt}
              min={0}
              max={Math.round(collateral * 0.84)}
              step={5}
              onChange={setDebt}
              thumbTone={levelTone(level)}
              formatValue={(v) => `${fmtUsd(v)}, ${fmtPct(v / collateral)} LTV`}
              zones={riskZones(SOL).map((z) => ({ from: collateral * z.from, to: collateral * z.to, tone: levelTone(z.level) }))}
            />
            <p className="text-center text-xs text-ink-3">Drag to borrow more.</p>
          </div>
        </Card>
      </div>
    </section>
  );
}

function Evidence() {
  const items = [
    { n: '~1,700', l: 'Kamino wallets partially liquidated on 10 Oct 2025, when SOL fell ~14% in under an hour — mostly off-hours.', src: 'https://gov.kamino.finance/t/kamino-lend-risk-event-analysis-10th-of-october-2025/847', s: 'Kamino risk report' },
    { n: '7.5%', l: 'The SOL drop that liquidates a loan at Kamino’s own 74% borrow limit. Today’s UI shows both numbers but never this one.', src: 'https://kamino.com/docs/products/borrow/concepts', s: 'Kamino docs formula' },
    { n: '1.06%', l: 'JitoSOL/SOL Multiply APY at max 7.7× leverage — versus 4.75% for just holding JitoSOL. More leverage earns less right now.', src: 'https://kamino.com/multiply', s: `kamino.com, ${SNAPSHOT_DATE}` },
  ];
  return (
    <section aria-label="Evidence" className="border-b border-line bg-surface-1/40">
      <div className="mx-auto grid max-w-content gap-6 px-4 py-12 md:grid-cols-3 md:gap-8 md:px-8">
        {items.map((i) => (
          <figure key={i.n} className="flex flex-col gap-2">
            <p className="num font-display text-d-lg font-semibold">{i.n}</p>
            <figcaption className="text-sm text-ink-2">{i.l}</figcaption>
            <a href={i.src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              {i.s} <ArrowUpRight size={12} aria-hidden />
            </a>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Method() {
  return (
    <section aria-labelledby="method-h" className="border-t border-line">
      <div className="mx-auto grid max-w-content gap-8 px-4 py-12 md:grid-cols-[1fr_2fr] md:px-8 md:py-16">
        <div>
          <p className="eyebrow">How this was made</p>
          <h2 id="method-h" className="mt-2 text-d-sm font-semibold">Honest by construction.</h2>
        </div>
        <ul className="grid gap-4 text-sm text-ink-2 md:grid-cols-2">
          <li><span className="font-semibold text-ink-1">Real “before” screens.</span> Captured from kamino.com on {SNAPSHOT_DATE}, without a wallet. Nothing recreated.</li>
          <li><span className="font-semibold text-ink-1">Real numbers.</span> Prices, LTVs and APYs are from that snapshot. The Multiply maths reproduces Kamino’s own figures.</li>
          <li><span className="font-semibold text-ink-1">Hypotheses labelled.</span> The Safe/Careful/Danger bands and “est.” risk labels are design choices, and say so.</li>
          <li><span className="font-semibold text-ink-1">Nothing is sent.</span> No wallet, no transactions. Every button is a mock.</li>
        </ul>
        <div className="md:col-start-2">
          <Link to="/system" className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
            <Images size={16} aria-hidden /> Tokens, components and colour checks
          </Link>
        </div>
      </div>
    </section>
  );
}
