import { useEffect, useId } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { riskLevel, riskZones, RISK_COPY, type RiskParams } from '../lib/risk';
import { fmtPct } from '../lib/format';
import { RiskBadge, cx } from './primitives';

/*
  Semicircle gauge: 0% LTV at the left, 100% at the right, linear (honest) scale.
  Zones: safe → careful (up to the borrow limit) → danger (up to liquidation) → hatched "liquidation zone".
  Needle eases with a spring so a dragged slider feels physical; it snaps instantly under reduced motion.
*/

const W = 264;
const H = 132;
const CX = W / 2;
const CY = 120;
const R = 100;
const STROKE = 16;

const pt = (v: number, r = R) => {
  const a = Math.PI * (1 - v);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
};
const arc = (from: number, to: number, r = R) => {
  const a = pt(from, r);
  const b = pt(to, r);
  // A semicircle never spans more than 180°, so the large-arc flag is always 0.
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
};

export interface HealthGaugeProps extends RiskParams {
  ltv: number;
  /** Previous LTV, drawn as a faint ghost needle (before → after previews). */
  ghostLtv?: number;
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  showReadout?: boolean;
  caption?: string;
  className?: string;
}

const GAP = 0.006; // visual gap between zones, in LTV units

export function HealthGauge({
  ltv,
  maxLtv,
  liqLtv,
  ghostLtv,
  size = 'md',
  showLegend = true,
  showReadout = true,
  caption,
  className,
}: HealthGaugeProps) {
  const p = { maxLtv, liqLtv };
  const level = riskLevel(ltv, p);
  const reduce = useReducedMotion();
  const patternId = useId();

  const spring = useSpring(Math.min(ltv, 1), { stiffness: 170, damping: 24, mass: 0.9 });
  useEffect(() => {
    if (reduce) spring.jump(Math.min(ltv, 1));
    else spring.set(Math.min(ltv, 1));
  }, [ltv, reduce, spring]);
  const nx = useTransform(spring, (v) => pt(v, R - 22).x);
  const ny = useTransform(spring, (v) => pt(v, R - 22).y);

  const COLOR = { safe: 'rgb(var(--safe))', careful: 'rgb(var(--caution))', danger: 'rgb(var(--danger))' };
  const zones = riskZones(p).map((z) => ({ ...z, color: COLOR[z.level] }));
  const width = { sm: 168, md: 240, lg: 320 }[size];

  return (
    <figure className={cx('flex flex-col items-center', className)} style={{ width: '100%', maxWidth: width + 80 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: width }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ltv * 100)}
        aria-valuetext={`Loan-to-value ${fmtPct(ltv)}. ${RISK_COPY[level].label}. Borrow limit ${fmtPct(maxLtv, 0)}, liquidation at ${fmtPct(liqLtv, 0)}.`}
        aria-label="Position health"
      >
        <defs>
          <pattern id={patternId} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="rgb(var(--danger) / 0.12)" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="rgb(var(--danger) / 0.55)" strokeWidth="2" />
          </pattern>
        </defs>

        {/* track */}
        <path d={arc(0, 1)} fill="none" stroke="rgb(var(--surface-3))" strokeWidth={STROKE} strokeLinecap="round" />
        {/* zones (dimmed beyond the needle so "where you are" reads first) */}
        {zones.map((z, i) => (
          <path
            key={i}
            d={arc(z.from + (i ? GAP : 0), z.to - GAP)}
            fill="none"
            stroke={z.color}
            strokeOpacity={ltv >= z.from ? 1 : 0.35}
            strokeWidth={STROKE}
            strokeLinecap={i === 0 ? 'round' : 'butt'}
            style={{ transition: 'stroke-opacity var(--dur-base) var(--ease-standard)' }}
          />
        ))}
        {/* liquidation zone */}
        <path d={arc(liqLtv + GAP, 1)} fill="none" stroke={`url(#${patternId})`} strokeWidth={STROKE} strokeLinecap="round" />

        {/* ticks: borrow limit (neutral) and liquidation (danger, longer) */}
        <Tick v={maxLtv} len={8} color="rgb(var(--text-2))" />
        <Tick v={liqLtv} len={12} color="rgb(var(--danger))" width={2.5} />

        {/* ghost needle */}
        {ghostLtv !== undefined && (
          <line
            x1={CX}
            y1={CY}
            x2={pt(Math.min(ghostLtv, 1), R - 22).x}
            y2={pt(Math.min(ghostLtv, 1), R - 22).y}
            stroke="rgb(var(--text-3))"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="2 5"
          />
        )}
        {/* needle */}
        <motion.line x1={CX} y1={CY} x2={nx} y2={ny} stroke="rgb(var(--text-1))" strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={7} fill="rgb(var(--surface-1))" stroke="rgb(var(--text-1))" strokeWidth={3} />
      </svg>

      {showReadout && (
        <div className="-mt-1 flex flex-col items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className={cx('num font-semibold tracking-tight', size === 'sm' ? 'text-d-sm' : 'text-d-md')}>
              {fmtPct(ltv)}
            </span>
            <span className="text-xs text-ink-2">LTV</span>
          </div>
          <RiskBadge level={level} size={size === 'sm' ? 'sm' : 'md'} />
          {caption && <figcaption className="max-w-[28ch] text-center text-sm text-ink-2">{caption}</figcaption>}
        </div>
      )}

      {showLegend && (
        <dl className="mt-4 grid w-full grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xs bg-surface-2 px-2 py-1">
            <span aria-hidden className="h-3 w-0.5 rounded-full bg-ink-2" />
            <dt className="text-ink-2">Borrow limit</dt>
            <dd className="num ml-auto font-semibold">{fmtPct(maxLtv, 0)}</dd>
          </div>
          <div className="flex items-center gap-2 rounded-xs bg-surface-2 px-2 py-1">
            <span aria-hidden className="h-3 w-1 rounded-full bg-danger" />
            <dt className="text-ink-2">Liquidation</dt>
            <dd className="num ml-auto font-semibold text-danger">{fmtPct(liqLtv, 0)}</dd>
          </div>
        </dl>
      )}
    </figure>
  );
}

function Tick({ v, len, color, width = 2 }: { v: number; len: number; color: string; width?: number }) {
  const a = pt(v, R + STROKE / 2 + 2);
  const b = pt(v, R + STROKE / 2 + 2 + len);
  const c = pt(v, R - STROKE / 2);
  return (
    <g>
      <line x1={c.x} y1={c.y} x2={a.x} y2={a.y} stroke="rgb(var(--surface-1))" strokeWidth={width + 2} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
    </g>
  );
}
