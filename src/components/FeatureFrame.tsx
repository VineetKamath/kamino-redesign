import type { ReactNode } from 'react';
import { ExternalLink, ImageOff } from 'lucide-react';
import { STATES, STATE_LABEL, useReviewState, useView, type ReviewState } from '../lib/review';
import { useMediaQuery } from '../lib/useMediaQuery';
import { SNAPSHOT_DATE } from '../data/kamino';
import { Segmented, cx } from './primitives';

export interface BeforeShot {
  desktop: string;
  mobile?: string;
  caption: string;
}

/*
  Shared frame for each feature: number + title, the problem in one line with its evidence,
  a Before/After toggle (real screenshots) and the design-review state bar.
*/
export function FeatureFrame({
  n,
  title,
  problem,
  evidence,
  before,
  states = STATES as unknown as ReviewState[],
  children,
}: {
  n: number;
  title: string;
  problem: string;
  evidence: { label: string; href: string }[];
  before: BeforeShot[];
  states?: ReviewState[];
  children: ReactNode;
}) {
  const [view, setView] = useView();
  const [state, setState] = useReviewState();

  // ?clean=1 renders the product screen only (no review chrome) — used for the Figma export.
  if (new URLSearchParams(window.location.search).get('clean') === '1') {
    return <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-6 md:px-8 md:py-10">{children}</div>;
  }

  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[62ch]">
          <p className="eyebrow">Feature {n} of 5</p>
          <h1 className="mt-1 text-d-md font-semibold md:text-d-lg">{title}</h1>
          <p className="mt-2 text-sm text-ink-2 md:text-base">{problem}</p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {evidence.map((e) => (
              <a key={e.href} href={e.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                {e.label}
                <ExternalLink aria-hidden size={12} />
              </a>
            ))}
          </p>
        </div>
        <Segmented
          label="Compare with Kamino today"
          value={view}
          onChange={setView}
          options={[
            { value: 'after', label: 'Redesign' },
            { value: 'before', label: 'Kamino today' },
          ]}
        />
      </header>

      {view === 'after' && (
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" role="toolbar" aria-label="Design review states">
          <div className="flex w-max items-center gap-1 rounded-sm bg-surface-1 p-1 ring-1 ring-inset ring-line">
            <span className="px-2 text-micro font-semibold uppercase tracking-wider text-ink-3">State</span>
            {states.map((s) => (
              <button
                key={s}
                onClick={() => setState(s)}
                aria-pressed={state === s}
                className={cx(
                  'h-8 rounded-xs px-3 text-xs font-semibold transition duration-fast',
                  state === s ? 'bg-surface-3 text-ink-1' : 'text-ink-2 hover:text-ink-1',
                )}
              >
                {STATE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'after' ? children : <Before shots={before} />}
    </div>
  );
}

function Before({ shots }: { shots: BeforeShot[] }) {
  const mobile = useMediaQuery('(max-width: 767px)');
  if (!shots.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md bg-surface-1 px-6 py-16 text-center ring-1 ring-inset ring-line">
        <ImageOff aria-hidden className="text-ink-3" />
        <p className="font-semibold">No real screenshot yet</p>
        <p className="max-w-[44ch] text-sm text-ink-2">This screen only exists with a connected wallet. It will be added from a real screenshot, never recreated.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {shots.map((s) => {
        const src = mobile && s.mobile ? s.mobile : s.desktop;
        return (
          <figure key={s.desktop} className="flex flex-col gap-2">
            {/* Some real pages are 9,000px+ tall: scroll inside a frame instead of the whole page. */}
            <div
              tabIndex={0}
              aria-label={`Scrollable screenshot: ${s.caption}`}
              className={cx('max-h-[80dvh] overflow-y-auto overscroll-contain rounded-md ring-1 ring-inset ring-line md:max-h-[1100px]', mobile && s.mobile && 'mx-auto max-w-[390px]')}
            >
              <img src={`/before/${src}`} alt={`Kamino today: ${s.caption}`} className="block w-full" loading="lazy" />
            </div>
            <figcaption className="text-xs text-ink-3">
              <span className="font-semibold text-ink-2">Real screenshot</span> · kamino.com, {SNAPSHOT_DATE}, no wallet connected · {s.caption}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
