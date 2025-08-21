import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        paintbox: {
          brand: 'var(--color-paintbox-brand)',
          'brand-600': 'var(--color-paintbox-brand-600)',
          'brand-500': 'var(--color-paintbox-brand-500)',
          'brand-400': 'var(--color-paintbox-brand-400)',
          accent: 'var(--color-paintbox-accent)',
          'accent-2': 'var(--color-paintbox-accent-2)',
          background: 'var(--color-paintbox-background)',
          surface: 'var(--color-paintbox-surface)',
          overlay: 'var(--color-paintbox-overlay)',
          text: 'var(--color-paintbox-text)',
          'text-muted': 'var(--color-paintbox-text-muted)',
          border: 'var(--color-paintbox-border)',
          error: 'var(--color-paintbox-error)',
          success: 'var(--color-paintbox-success)',
          warning: 'var(--color-paintbox-warning)',
          primary: 'var(--color-paintbox-brand)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
