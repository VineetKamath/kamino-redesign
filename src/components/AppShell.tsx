import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Gauge, Layers, LifeBuoy, Repeat2, TrendingDown, type LucideIcon } from 'lucide-react';
import { Footer } from './Footer';
import { cx } from './primitives';

export const FEATURES: { to: string; n: number; label: string; short: string; icon: LucideIcon }[] = [
  { to: '/borrow', n: 1, label: 'Borrow health gauge', short: 'Borrow', icon: Gauge },
  { to: '/what-if', n: 2, label: 'What-if scrubber', short: 'What if', icon: TrendingDown },
  { to: '/multiply', n: 3, label: 'Multiply, visualised', short: 'Multiply', icon: Repeat2 },
  { to: '/discover', n: 4, label: 'Vault discovery', short: 'Discover', icon: Layers },
  { to: '/position', n: 5, label: 'Fix my position', short: 'Position', icon: LifeBuoy },
];

export function Wordmark() {
  // Text wordmark, deliberately not Kamino's logo file: this is a concept, not an impersonation.
  return (
    <Link to="/" className="flex items-baseline gap-2 rounded-xs">
      <span className="font-display text-[22px] font-semibold tracking-tight">kamino</span>
      <span className="rounded-xs bg-surface-3 px-1 py-0.5 text-micro font-semibold uppercase tracking-wider text-ink-2">concept</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-content items-center gap-6 px-4 md:px-8">
          <Wordmark />
          <nav aria-label="Features" className="hidden flex-1 items-center gap-1 md:flex">
            {FEATURES.map((f) => (
              <NavLink
                key={f.to}
                to={f.to}
                className={({ isActive }) =>
                  cx('rounded-sm px-3 py-2 text-sm font-medium transition duration-fast', isActive ? 'bg-surface-2 text-ink-1' : 'text-ink-2 hover:text-ink-1')
                }
              >
                {f.short}
              </NavLink>
            ))}
          </nav>
          <span className="ml-auto flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-2 ring-1 ring-inset ring-line md:ml-0">
            <span aria-hidden className="size-2 rounded-full bg-ink-3" />
            <span className="md:hidden">Demo · no wallet</span>
            <span className="hidden md:inline">Demo wallet · not connected</span>
          </span>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <div className="pb-16 md:pb-0">
        <Footer />
      </div>

      {/* Mobile tab bar: thumb-reachable, the five features */}
      <nav aria-label="Features" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {FEATURES.map((f) => (
          <NavLink
            key={f.to}
            to={f.to}
            className={({ isActive }) => cx('flex h-16 flex-col items-center justify-center gap-1 text-micro font-medium', isActive ? 'text-accent' : 'text-ink-3')}
          >
            <f.icon aria-hidden size={20} />
            {f.short}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
