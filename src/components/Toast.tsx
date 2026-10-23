import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CircleCheck, Info, OctagonAlert, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { RiskGlyph, cx } from './primitives';
import type { RiskLevel } from '../lib/risk';

type Tone = 'info' | 'success' | 'caution' | 'danger';
export interface ToastData {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
}

// Success uses the safe teal + check: "your position is now safe" is the outcome we celebrate.
const TONE: Record<Tone, { icon: LucideIcon; color: string; bar: string }> = {
  info: { icon: Info, color: 'text-accent', bar: 'bg-accent' },
  success: { icon: CircleCheck, color: 'text-safe', bar: 'bg-safe' },
  caution: { icon: TriangleAlert, color: 'text-caution', bar: 'bg-caution' },
  danger: { icon: OctagonAlert, color: 'text-danger', bar: 'bg-danger' },
};

// Risk tones reuse the badge shapes (● ▲ ◆) so a toast reads the same as the gauge it refers to.
const GLYPH: Partial<Record<Tone, RiskLevel>> = { success: 'safe', caution: 'careful', danger: 'danger' };

export function ToastCard({ t, onClose }: { t: Omit<ToastData, 'id'>; onClose?: () => void }) {
  const s = TONE[t.tone];
  const Icon = s.icon;
  const glyph = GLYPH[t.tone];
  return (
    <div className="relative flex w-full gap-3 overflow-hidden rounded-md bg-surface-2 py-3 pl-4 pr-3 shadow-e3 ring-1 ring-inset ring-line-strong">
      <span aria-hidden className={cx('absolute inset-y-0 left-0 w-1', s.bar)} />
      {glyph ? (
        <span className={cx('mt-1 shrink-0', s.color)}><RiskGlyph level={glyph} size={12} /></span>
      ) : (
        <Icon aria-hidden size={18} className={cx('mt-0.5 shrink-0', s.color)} strokeWidth={2.25} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t.title}</p>
        {t.body && <p className="mt-0.5 text-sm text-ink-2">{t.body}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-xs text-ink-3 hover:text-ink-1">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

const Ctx = createContext<(t: Omit<ToastData, 'id'>) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastData[]>([]);
  const reduce = useReducedMotion();
  const remove = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (t: Omit<ToastData, 'id'>) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs.slice(-2), { ...t, id }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:w-[380px]">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduce}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.14 } }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
              className="pointer-events-auto w-full"
            >
              <ToastCard t={t} onClose={() => remove(t.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
