import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'mad-bone': '#fafaf9',
        'mad-ink': '#1a1a1a',
        'mad-stone': '#e5e5e5',
        'mad-bronze': '#b87333',
        'mad-slate': '#64748b',
        // Add shorthand versions without 'mad-' prefix
        'bone': 'var(--mad-bone)',
        'ink': 'var(--mad-ink)',
        'stone': 'var(--mad-stone)',
        'bronze': 'var(--mad-bronze)',
        'slate': 'var(--mad-slate)'
      },
      boxShadow: {
        'brand': 'var(--mad-shadow-soft)'
      },
      borderRadius: {
        'brand': 'var(--mad-radius-xl)'
      }
    }
  },
  plugins: []
} satisfies Config
