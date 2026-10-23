import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { RISK_COPY, type RiskLevel } from '../lib/risk';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ── Risk: colour is never the only signal — every level has a distinct solid shape and a word.
      Outline icons (circle vs octagon) blur together at 12px; filled ● ▲ ◆ don't. ── */
export const RISK_STYLE: Record<RiskLevel, { text: string; bg: string; stroke: string }> = {
  safe: { text: 'text-safe', bg: 'bg-safe/10', stroke: 'rgb(var(--safe))' },
  careful: { text: 'text-caution', bg: 'bg-caution/10', stroke: 'rgb(var(--caution))' },
  danger: { text: 'text-danger', bg: 'bg-danger/10', stroke: 'rgb(var(--danger))' },
  liquidatable: { text: 'text-danger', bg: 'bg-danger/20', stroke: 'rgb(var(--danger))' },
};

export function RiskGlyph({ level, size = 10 }: { level: RiskLevel; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 10 10" className="shrink-0" fill="currentColor">
      {level === 'safe' && <circle cx="5" cy="5" r="4.5" />}
      {level === 'careful' && <path d="M5 0.6 9.7 9.2H0.3Z" />}
      {level === 'danger' && <path d="M5 0 10 5 5 10 0 5Z" />}
      {level === 'liquidatable' && (
        <>
          <path d="M5 0 10 5 5 10 0 5Z" />
          <path d="M5.6 2 3.4 5.4h1.7L4.4 8l2.2-3.4H4.9Z" fill="rgb(var(--canvas))" />
        </>
      )}
    </svg>
  );
}

export function RiskBadge({ level, size = 'md', withHint = false }: { level: RiskLevel; size?: 'sm' | 'md'; withHint?: boolean }) {
  const s = RISK_STYLE[level];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        s.text,
        s.bg,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      <RiskGlyph level={level} size={size === 'sm' ? 9 : 11} />
      {RISK_COPY[level].label}
      {withHint && <span className="font-normal text-ink-2">· {RISK_COPY[level].short}</span>}
    </span>
  );
}

/* ── Button ── */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface-2 text-ink-1 shadow-e1 ring-1 ring-inset ring-line hover:bg-surface-3',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
  danger: 'bg-danger text-accent-ink hover:brightness-110',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg'; icon?: LucideIcon; loading?: boolean }
>(function Button({ variant = 'primary', size = 'md', icon: Icon, loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-sm font-semibold transition duration-fast ease-standard',
        loading ? 'cursor-progress' : 'disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        BUTTON[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : Icon && <Icon aria-hidden size={size === 'sm' ? 14 : 16} strokeWidth={2.25} />}
      {children}
    </button>
  );
});

export const Spinner = ({ className }: { className?: string }) => (
  <span
    aria-hidden
    className={cx('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    style={{ animationDuration: '700ms' }}
  />
);

/* ── Card ── */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-md bg-surface-1 shadow-e1 ring-1 ring-inset ring-line', className)} {...rest}>
      {children}
    </div>
  );
}

/* ── Token icon (official Kamino CDN logos, see public/tokens/SOURCES.md) ── */
export function TokenIcon({ symbol, size = 24, className }: { symbol: string; size?: number; className?: string }) {
  return (
    <img
      src={`/tokens/${symbol.toLowerCase()}.png`}
      alt=""
      width={size}
      height={size}
      className={cx('shrink-0 rounded-full bg-surface-3', className)}
      style={{ width: size, height: size }}
    />
  );
}

export function TokenPair({ a, b, size = 24 }: { a: string; b: string; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size * 1.6, height: size }}>
      <TokenIcon symbol={a} size={size} className="ring-2 ring-surface-1" />
      <span className="absolute top-0" style={{ left: size * 0.6 }}>
        <TokenIcon symbol={b} size={size} className="ring-2 ring-surface-1" />
      </span>
    </span>
  );
}

/* ── Stat chip: one number, one label, optional change ── */
export function StatChip({
  label,
  value,
  delta,
  tone = 'neutral',
  hint,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  tone?: 'neutral' | 'safe' | 'caution' | 'danger';
  hint?: string;
  icon?: LucideIcon;
}) {
  const toneText = { neutral: 'text-ink-1', safe: 'text-safe', caution: 'text-caution', danger: 'text-danger' }[tone];
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-sm bg-surface-2 px-3 py-2 ring-1 ring-inset ring-line" title={hint}>
      <span className="flex items-center gap-1 text-xs text-ink-2">
        {Icon && <Icon aria-hidden size={12} />}
        {label}
      </span>
      <span className={cx('num truncate text-base font-semibold', toneText)}>{value}</span>
      {delta && <span className="num text-xs text-ink-3">{delta}</span>}
    </div>
  );
}

/* ── Segmented control (used for Before/After, Cards/Table) ── */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-sm bg-surface-2 p-1 ring-1 ring-inset ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-8 rounded-xs px-3 text-xs font-semibold transition duration-fast ease-standard',
            value === o.value ? 'bg-surface-3 text-ink-1 shadow-e2' : 'text-ink-2 hover:text-ink-1',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
