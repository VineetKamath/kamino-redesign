import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cx } from './primitives';

/*
  Accessible slider with risk zones painted on the track and labelled marks
  (e.g. "Liquidation −28%"). One component powers the borrow amount, the price scrubber
  and the leverage slider so they behave identically.
  Keyboard: ←/→ step, PgUp/PgDn ×10, Home/End.
*/

export type ZoneTone = 'safe' | 'caution' | 'danger' | 'neutral';
const ZONE_BG: Record<ZoneTone, string> = {
  safe: 'bg-safe',
  caution: 'bg-caution',
  danger: 'bg-danger',
  neutral: 'bg-surface-3',
};

export interface ScrubberProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  formatValue: (v: number) => string;
  zones?: { from: number; to: number; tone: ZoneTone }[];
  marks?: { value: number; label: string; tone?: 'neutral' | 'danger' }[];
  /** Fill from the left (amounts) or no fill (price change, where 0 is in the middle). */
  fill?: boolean;
  thumbTone?: ZoneTone;
  /** Show the pressed thumb + value bubble (used for the "interacting" review state, and while dragging). */
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Scrubber({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  formatValue,
  zones = [],
  marks = [],
  fill = true,
  thumbTone = 'neutral',
  active = false,
  disabled,
  className,
}: ScrubberProps) {
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pressed = active || dragging;
  const pct = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100;
  const snap = useCallback(
    (v: number) => {
      const s = Math.round((v - min) / step) * step + min;
      return Number(Math.min(max, Math.max(min, s)).toFixed(6));
    },
    [min, max, step],
  );

  const fromPointer = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    onChange(snap(min + ((e.clientX - r.left) / r.width) * (max - min)));
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = {
      ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step,
      PageUp: step * 10, PageDown: -step * 10,
    };
    if (e.key in map) onChange(snap(value + map[e.key]));
    else if (e.key === 'Home') onChange(min);
    else if (e.key === 'End') onChange(max);
    else return;
    e.preventDefault();
  };

  const thumbRing = {
    safe: 'ring-safe', caution: 'ring-caution', danger: 'ring-danger', neutral: 'ring-accent',
  }[thumbTone];

  return (
    <div className={cx('select-none', disabled && 'opacity-45', className)}>
      <div
        ref={track}
        className="relative h-[44px] touch-none cursor-pointer"
        onPointerDown={(e) => {
          if (disabled) return;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setDragging(true);
          fromPointer(e);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onPointerMove={(e) => !disabled && e.buttons === 1 && fromPointer(e)}
      >
        {/* track */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-surface-3">
          {/* Zones stay visible; with `fill`, the part already "spent" is full strength and the rest is dimmed,
              matching the gauge. Without zones, fill is a plain ink bar. */}
          {zones.map((z, i) => {
            const left = pct(z.from);
            const width = pct(z.to) - left;
            const lit = fill ? Math.max(0, Math.min(width, pct(value) - left)) : width;
            return (
              <div key={i} className="absolute inset-y-0" style={{ left: `${left}%`, width: `${width}%` }}>
                <div className={cx('absolute inset-0 opacity-35', ZONE_BG[z.tone])} />
                <div className={cx('absolute inset-y-0 left-0', ZONE_BG[z.tone])} style={{ width: `${(lit / width) * 100}%` }} />
              </div>
            );
          })}
          {fill && zones.length === 0 && <div className="absolute inset-y-0 left-0 bg-ink-1/80" style={{ width: `${pct(value)}%` }} />}
        </div>
        {/* marks */}
        {marks.map((m) => (
          <div key={m.label} className="pointer-events-none absolute top-1/2" style={{ left: `${pct(m.value)}%` }}>
            <div className={cx('h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full', m.tone === 'danger' ? 'bg-danger' : 'bg-ink-2')} />
          </div>
        ))}
        {/* thumb */}
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatValue(value)}
          aria-disabled={disabled || undefined}
          onKeyDown={onKey}
          className={cx(
            'absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-1 ring-4 shadow-e2',
            'transition-[box-shadow,transform] duration-fast focus-visible:shadow-focus',
            pressed && 'scale-110 shadow-e3',
            thumbRing,
          )}
          style={{ left: `${pct(value)}%` }}
        />
        {pressed && (
          <span
            aria-hidden
            className="num pointer-events-none absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded-xs bg-ink-1 px-2 py-0.5 text-xs font-semibold text-canvas shadow-e2"
            style={{ left: `clamp(24px, ${pct(value)}%, calc(100% - 24px))` }}
          >
            {formatValue(value).split(',')[0]}
          </span>
        )}
      </div>
      {marks.length > 0 && (
        <div className="relative h-5">
          {marks.map((m) => (
            <span
              key={m.label}
              className={cx(
                'num absolute -translate-x-1/2 whitespace-nowrap text-micro font-semibold',
                m.tone === 'danger' ? 'text-danger' : 'text-ink-2',
              )}
              style={{ left: `clamp(32px, ${pct(m.value)}%, calc(100% - 32px))` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
