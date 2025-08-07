/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'teal': {
          400: '#00CED1',
          500: '#00A5A8',
        },
        gray: {
          100: '#0A0A0A',
          200: '#1A1A1A',
          300: '#2A2A2A',
          400: '#3A3A3A',
          500: '#6A6A6A',
          600: '#8A8A8A',
          700: '#AAAAAA',
          800: '#CACACA',
          900: '#EAEAEA',
        },
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        border: 'var(--border-color)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)'
      },
      fontFamily: {
        'mono': ['Berkeley Mono', 'Courier New', 'monospace'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'xs': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
        'sm': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
        'base': 'clamp(1rem, 0.925rem + 0.375vw, 1.125rem)',
        'lg': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
        'xl': 'clamp(1.5rem, 1.3rem + 1vw, 1.875rem)',
        '2xl': 'clamp(2rem, 1.7rem + 1.5vw, 2.5rem)',
        '3xl': 'clamp(2.5rem, 2rem + 2.5vw, 3.5rem)',
        '4xl': 'clamp(3rem, 2.4rem + 3vw, 4.5rem)',
        '5xl': 'clamp(3.5rem, 2.8rem + 3.5vw, 5.5rem)',
        '6xl': 'clamp(4rem, 3.2rem + 4vw, 6.5rem)',
      },
      container: {
        center: true,
        padding: '1.5rem',
        screens: {
          '2xl': '1440px'
        }
      },
      animation: {
        'swim': 'swim 3s ease-in-out infinite',
        'fadeInUp': 'fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
      keyframes: {
        swim: {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '25%': { transform: 'translateX(10px) rotate(5deg)' },
          '75%': { transform: 'translateX(-10px) rotate(-5deg)' },
        },
        fadeInUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(40px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      transitionDuration: {
        '400': '400ms',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out': 'cubic-bezier(0.45, 0, 0.55, 1)',
        'elastic': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      maxWidth: {
        'screen-2xl': '1440px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}