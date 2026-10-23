import { ChevronRight } from 'lucide-react';
import type { RiskLevel } from '../lib/risk';
import { RiskBadge, TokenIcon, cx } from './primitives';

/*
  One row = one decision. Left: what it is. Right: the number that matters + its risk.
  Collapses to two lines at 390px instead of truncating columns (Kamino's mobile table truncates "$155.0…").
*/
export interface AssetRowProps {
  symbol: string;
  name: string;
  meta?: string;
  value: string;
  valueLabel?: string;
  sub?: string;
  risk?: RiskLevel;
  onClick?: () => void;
  selected?: boolean;
}

export function AssetRow({ symbol, name, meta, value, valueLabel, sub, risk, onClick, selected }: AssetRowProps) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cx(
        'group flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left transition duration-fast ease-standard',
        onClick && 'hover:bg-surface-2',
        selected && 'bg-surface-2 ring-1 ring-inset ring-accent/60',
      )}
    >
      <TokenIcon symbol={symbol} size={32} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{name}</span>
        {meta && <span className="truncate text-xs text-ink-2">{meta}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="num text-sm font-semibold">
          {value}
          {valueLabel && <span className="ml-1 text-xs font-normal text-ink-2">{valueLabel}</span>}
        </span>
        {risk ? <RiskBadge level={risk} size="sm" /> : sub && <span className="num text-xs text-ink-2">{sub}</span>}
      </span>
      {onClick && <ChevronRight aria-hidden size={16} className="shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink-2" />}
    </Comp>
  );
}

export function AssetRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3" aria-hidden>
      <Shimmer className="size-8 rounded-full" />
      <span className="flex flex-1 flex-col gap-2">
        <Shimmer className="h-3 w-24 rounded-xs" />
        <Shimmer className="h-2 w-16 rounded-xs" />
      </span>
      <span className="flex flex-col items-end gap-2">
        <Shimmer className="h-3 w-16 rounded-xs" />
        <Shimmer className="h-2 w-10 rounded-xs" />
      </span>
    </div>
  );
}

export function Shimmer({ className }: { className?: string }) {
  return <span className={cx('block animate-pulse bg-surface-3', className)} />;
}
