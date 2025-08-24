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
        
        // API-specific accent colors
        'api-primary': '#10b981', // Emerald for API
        'api-secondary': '#FFB347', // Amber as secondary
        
        // Semantic color mappings
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#10b981', // Using emerald for API
        background: '#FAFAF8',
        foreground: '#1A1A1A',
        primary: {
          DEFAULT: '#10b981', // Emerald for API
          foreground: '#ffffff',
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
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Tiempos', 'Georgia', 'serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.5s ease-out',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}