/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        raised: token('raised'),
        hover: token('hover'),
        line: token('line'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        'fg-muted': token('fg-muted'),
        'fg-subtle': token('fg-subtle'),
        accent: token('accent'),
        'accent-hover': token('accent-hover'),
        'accent-fg': token('accent-fg'),
        danger: token('danger'),
        success: token('success'),
        warning: token('warning'),
        info: token('info'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        overlay: '0 16px 48px -12px rgb(0 0 0 / 0.6), 0 0 0 1px rgb(var(--line-strong) / 1)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-in': { from: { transform: 'translateX(16px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
        'toast-in': { from: { transform: 'translateY(8px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
        indeterminate: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(300%)' } },
      },
      animation: {
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
        'fade-in': 'fade-in 200ms ease-out',
        'slide-in': 'slide-in 220ms ease-out',
        'toast-in': 'toast-in 200ms ease-out',
      },
    },
  },
  plugins: [],
};
