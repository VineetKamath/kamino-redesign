/** Tailwind maps onto the CSS variables in src/styles/tokens.css — tokens are the single source of truth. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // 8pt grid with a 4px half-step for tight UI (icon gaps, chip padding)
    spacing: {
      0: '0', px: '1px', 0.5: '2px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px',
      8: '32px', 10: '40px', 12: '48px', 16: '64px', 20: '80px', 24: '96px', 32: '128px',
    },
    borderRadius: { none: '0', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      canvas: v('canvas'),
      surface: { 1: v('surface-1'), 2: v('surface-2'), 3: v('surface-3') },
      line: { DEFAULT: v('line'), strong: v('line-strong') },
      ink: { 1: v('text-1'), 2: v('text-2'), 3: v('text-3') },
      accent: { DEFAULT: v('accent'), ink: v('accent-ink') },
      safe: v('safe'),
      caution: v('caution'),
      danger: v('danger'),
    },
    fontFamily: {
      display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
      ui: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      // [size, line-height] — UI scale stays close to Kamino's 12/14/16 so density is familiar
      micro: ['11px', '14px'],
      xs: ['12px', '16px'],
      sm: ['14px', '20px'],
      base: ['16px', '24px'],
      lg: ['18px', '26px'],
      // Display scale (Bricolage) — 1.333 ratio from 24
      'd-sm': ['24px', '30px'],
      'd-md': ['32px', '38px'],
      'd-lg': ['44px', '48px'],
      'd-xl': ['60px', '62px'],
    },
    extend: {
      boxShadow: {
        // Dark UIs show elevation with lighter surfaces; shadows are reserved for things that float.
        e1: 'inset 0 1px 0 rgb(255 255 255 / 0.04)',
        e2: 'inset 0 1px 0 rgb(255 255 255 / 0.05), 0 2px 8px rgb(2 6 14 / 0.35)',
        e3: 'inset 0 1px 0 rgb(255 255 255 / 0.06), 0 16px 48px rgb(2 6 14 / 0.6)',
        focus: '0 0 0 2px rgb(var(--canvas)), 0 0 0 4px rgb(var(--accent))',
      },
      transitionDuration: { instant: '80ms', fast: '140ms', base: '220ms', slow: '360ms' },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        enter: 'cubic-bezier(0, 0, 0, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },
      maxWidth: { content: '1200px' },
    },
  },
  plugins: [],
};
