import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useMediaQuery } from '../lib/useMediaQuery';

/*
  Bottom sheet on phones (thumb-reachable, drag down to dismiss), centred dialog on desktop.
  Esc closes, focus moves in on open and returns to the trigger on close.
*/
export function ActionSheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const desktop = useMediaQuery('(min-width: 768px)');
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose; // latest callback without re-running the focus effect

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab' || !panel.current) return;
      // Keep focus inside the dialog
      const f = panel.current.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  const t = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 38 };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <motion.div
            className="absolute inset-0 bg-canvas/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-surface-1 shadow-e3 ring-1 ring-inset ring-line md:max-w-[480px] md:rounded-lg"
            initial={desktop ? { opacity: 0, scale: 0.97, y: 8 } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.98 } : { y: '100%' }}
            transition={t}
            drag={desktop ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
          >
            {!desktop && <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" />}
            <header className="flex items-start gap-3 px-6 pb-2 pt-4">
              <div className="flex-1">
                <h2 className="text-d-sm font-semibold">{title}</h2>
                {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className="-mr-2 grid size-10 place-items-center rounded-sm text-ink-2 hover:bg-surface-2 hover:text-ink-1">
                <X size={18} />
              </button>
            </header>
            <div className="overflow-y-auto px-6 pb-6 pt-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
