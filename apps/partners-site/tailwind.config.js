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
        
        // Partner-specific accent colors
        'partner-primary': '#3A3A60', // Deep indigo as primary for partners
        'partner-secondary': '#FFB347', // Amber as secondary
        
        // Semantic color mappings
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#3A3A60', // Using deep-indigo for partners
        background: '#FAFAF8',
        foreground: '#1A1A1A',
        primary: {
          DEFAULT: '#3A3A60', // Deep indigo for partners
          foreground: '#FAFAF8',
        },
        secondary: {
          DEFAULT: '#FFB347',
          foreground: '#1A1A1A',
        },
        muted: {
          DEFAULT: '#D8D3C4',
          foreground: '#6B6B6B',
        },
        accent: {
          DEFAULT: '#3A3A60',
          foreground: '#FAFAF8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Tiempos', 'Georgia', 'serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}