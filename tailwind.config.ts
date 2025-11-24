import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1021',
        'bg-soft': '#0f162d',
        panel: '#121a33',
        card: '#131d3a',
        'card-2': '#10192f',
        accent: '#3be0b4',
        'accent-2': '#ffb347',
        danger: '#ff6b6b',
        text: '#e6edf7',
        muted: '#9fb1d0',
        border: '#1f2a45',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 20px 60px rgba(0, 0, 0, 0.35)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
