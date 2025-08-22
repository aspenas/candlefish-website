import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // NANDA Consciousness Theme Colors
        consciousness: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bfccff',
          300: '#91a7ff',
          400: '#5d75ff',
          500: '#3f4dff',
          600: '#2b35f5',
          700: '#2027e1',
          800: '#1f23b6',
          900: '#1e2390',
          950: '#151866',
        },
        neural: {
          50: '#f7f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        quantum: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        matrix: {
          50: '#f7fffc',
          100: '#e9fff6',
          200: '#d0ffeb',
          300: '#a7ffd7',
          400: '#70ffbf',
          500: '#3dffa4',
          600: '#1bff88',
          700: '#00e068',
          800: '#00b054',
          900: '#009147',
          950: '#003d1f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'system-ui'],
      },
      animation: {
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'neural-pulse': 'neural-pulse 4s ease-in-out infinite',
        'consciousness-flow': 'consciousness-flow 6s linear infinite',
        'matrix-rain': 'matrix-rain 20s linear infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'glow': {
          '0%': {
            'box-shadow': '0 0 5px rgb(63, 77, 255), 0 0 10px rgb(63, 77, 255), 0 0 15px rgb(63, 77, 255)',
          },
          '100%': {
            'box-shadow': '0 0 10px rgb(63, 77, 255), 0 0 20px rgb(63, 77, 255), 0 0 30px rgb(63, 77, 255)',
          },
        },
        'neural-pulse': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0.8' },
        },
        'consciousness-flow': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'matrix-rain': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'consciousness-gradient': 'linear-gradient(135deg, #3f4dff 0%, #8b5cf6 50%, #22c55e 100%)',
        'neural-gradient': 'linear-gradient(45deg, #1f23b6 0%, #5b21b6 50%, #14532d 100%)',
        'quantum-grid': 'radial-gradient(circle at 25% 25%, #3f4dff 0%, transparent 50%), radial-gradient(circle at 75% 75%, #8b5cf6 0%, transparent 50%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config
