/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../shared/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Candlefish brand colors
        'charcoal': '#1A1A1A',
        'warm-white': '#FAFAF8',
        'amber-flame': '#FFB347',
        'deep-indigo': '#3A3A60',
        'slate': '#6B6B6B',
        'muted-sand': '#D8D3C4',
        
        // Semantic color mappings
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#FFB347',
        background: '#FAFAF8',
        foreground: '#1A1A1A',
        primary: {
          DEFAULT: '#FFB347',
          foreground: '#1A1A1A',
        },
        secondary: {
          DEFAULT: '#3A3A60',
          foreground: '#FAFAF8',
        },
        muted: {
          DEFAULT: '#D8D3C4',
          foreground: '#6B6B6B',
        },
        accent: {
          DEFAULT: '#FFB347',
          foreground: '#1A1A1A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Tiempos', 'Georgia', 'serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#1A1A1A',
            maxWidth: 'none',
            a: {
              color: '#FFB347',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              '&:hover': {
                borderBottomColor: '#FFB347',
              },
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            code: {
              backgroundColor: '#f1f5f9',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            pre: {
              backgroundColor: '#0f172a',
              borderRadius: '0.5rem',
              padding: '1rem',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
            },
            blockquote: {
              borderLeftColor: '#FFB347',
              borderLeftWidth: '4px',
              backgroundColor: '#FAFAF8',
              padding: '1rem',
              borderRadius: '0.5rem',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}