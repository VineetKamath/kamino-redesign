import type { ReactNode } from 'react';
import { CloudOff, Inbox, type LucideIcon } from 'lucide-react';
import { Button, cx } from './primitives';
import { Shimmer } from './AssetRow';

/*
  Empty / error states always say what happened AND offer the next step.
  (Kamino's "Insufficient Liquidity" pill says neither — audit A17.)
*/
function StateFrame({ icon: Icon, tone, title, body, action }: { icon: LucideIcon; tone: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className={cx('grid size-12 place-items-center rounded-full bg-surface-2 ring-1 ring-inset ring-line', tone)}>
        <Icon aria-hidden size={22} />
      </span>
      <div>
        <p className="text-base font-semibold">{title}</p>
        <p className="mx-auto mt-1 max-w-[36ch] text-sm text-ink-2">{body}</p>
      </div>
      {action}
    </div>
  );
}

export const EmptyState = ({ title, body, action, icon = Inbox }: { title: string; body: string; action?: ReactNode; icon?: LucideIcon }) => (
  <StateFrame icon={icon} tone="text-ink-2" title={title} body={body} action={action} />
);

export const ErrorState = ({ title = 'Couldn’t load prices', body = 'The price feed didn’t respond. Your funds aren’t affected — this only changes what you see.', onRetry }: { title?: string; body?: string; onRetry?: () => void }) => (
  <StateFrame
    icon={CloudOff}
    tone="text-caution"
    title={title}
    body={body}
    action={onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
  />
);

// Same geometry as HealthGauge so nothing jumps when data arrives.
export function GaugeSkeleton({ maxWidth = 168 }: { maxWidth?: number }) {
  return (
    <div className="flex w-full flex-col items-center gap-2" aria-label="Loading position health" role="status">
      <svg viewBox="0 0 264 132" width="100%" style={{ maxWidth }} className="animate-pulse">
        <path d="M 32 120 A 100 100 0 0 1 232 120" fill="none" stroke="rgb(var(--surface-3))" strokeWidth={16} strokeLinecap="round" />
        <circle cx={132} cy={120} r={7} fill="rgb(var(--surface-3))" />
      </svg>
      <Shimmer className="h-6 w-20 rounded-xs" />
      <Shimmer className="h-5 w-16 rounded-full" />
    </div>
  );
}
