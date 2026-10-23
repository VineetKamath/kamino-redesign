import { useSearchParams } from 'react-router-dom';

/* Design-review states. Each is a URL (?state=danger) so screenshots and Figma frames are reproducible. */
export const STATES = ['default', 'interacting', 'warning', 'danger', 'success', 'loading', 'empty'] as const;
export type ReviewState = (typeof STATES)[number];

export const STATE_LABEL: Record<ReviewState, string> = {
  default: 'Default',
  interacting: 'Interacting',
  warning: 'Warning',
  danger: 'Danger',
  success: 'Success',
  loading: 'Loading',
  empty: 'Empty',
};

export function useReviewState(): [ReviewState, (s: ReviewState) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('state') as ReviewState | null;
  const state = raw && STATES.includes(raw) ? raw : 'default';
  const set = (s: ReviewState) => {
    const next = new URLSearchParams(params);
    if (s === 'default') next.delete('state');
    else next.set('state', s);
    setParams(next, { replace: true });
  };
  return [state, set];
}

export function useView(): ['after' | 'before', (v: 'after' | 'before') => void] {
  const [params, setParams] = useSearchParams();
  const v = params.get('view') === 'before' ? 'before' : 'after';
  return [
    v,
    (n) => {
      const next = new URLSearchParams(params);
      if (n === 'after') next.delete('view');
      else next.set('view', n);
      setParams(next, { replace: true });
    },
  ];
}
