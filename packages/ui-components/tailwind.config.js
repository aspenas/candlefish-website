/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        candlefish: {
          50: '#f0fdff',
          100: '#ccf9ff',
          200: '#99f1ff',
          300: '#5ce5ff',
          400: '#00ced1', // Primary brand teal
          500: '#00a5a8',
          600: '#008284',
          700: '#006668',
          800: '#004d4e',
          900: '#003638',
        },

        // Semantic colors aligned with existing CSS
        background: {
          primary: '#000000',
          secondary: '#0A0A0A',
          tertiary: '#1A1A1A',
        },

        text: {
          primary: '#FFFFFF',
          secondary: '#AAAAAA',
          tertiary: '#8A8A8A',
          accent: '#00CED1',
        },

        border: {
          DEFAULT: '#3A3A3A',
          light: '#2A2A2A',
          dark: '#1A1A1A',
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

        // Status colors
        success: '#059669',
        warning: '#FF6347',
        error: '#EF4444',
        info: '#3B82F6',
      },

      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Berkeley Mono', 'Courier New', 'monospace'],
        display: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },

      fontSize: {
        xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
        sm: 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
        base: 'clamp(1rem, 0.925rem + 0.375vw, 1.125rem)',
        lg: 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
        xl: 'clamp(1.5rem, 1.3rem + 1vw, 1.875rem)',
        '2xl': 'clamp(2rem, 1.7rem + 1.5vw, 2.5rem)',
        '3xl': 'clamp(2rem, 1.7rem + 1.5vw, 2.5rem)',
        '4xl': 'clamp(2.5rem, 2.1rem + 2vw, 3rem)',
        '5xl': 'clamp(3rem, 2.4rem + 2.5vw, 3.5rem)',
        '6xl': 'clamp(3.5rem, 2.8rem + 3vw, 4rem)',
      },

      spacing: {
        grid: '8px', // Base grid unit
      },

      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },

      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'pulse-gentle': 'pulse 4s ease-in-out infinite',
        'swim': 'swim 4s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },

      keyframes: {
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
        swim: {
          '0%, 100%': {
            transform: 'translateX(0) rotate(0deg)',
          },
          '25%': {
            transform: 'translateX(10px) rotate(5deg)',
          },
          '75%': {
            transform: 'translateX(-10px) rotate(-5deg)',
          },
        },
        glow: {
          '0%': {
            transform: 'scale(0.9)',
            opacity: '0.3',
          },
          '100%': {
            transform: 'scale(1.1)',
            opacity: '0.6',
          },
        },
        skeleton: {
          '0%': {
            backgroundPosition: '-200px 0',
          },
          '100%': {
            backgroundPosition: 'calc(200px + 100%) 0',
          },
        },
      },

      transitionTimingFunction: {
        'candlefish-primary': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'candlefish-elastic': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      transitionDuration: {
        'fast': '200ms',
        'normal': '400ms',
        'slow': '800ms',
        'slower': '1200ms',
      },

      backdropBlur: {
        xs: '2px',
      },

      boxShadow: {
        'glow': '0 0 20px rgba(0, 206, 209, 0.4)',
        'glow-lg': '0 0 40px rgba(0, 206, 209, 0.6)',
        'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.4)',
        'elevation-2': '0 4px 8px rgba(0, 0, 0, 0.5)',
        'elevation-3': '0 8px 16px rgba(0, 0, 0, 0.6)',
      },

      container: {
        center: true,
        padding: '1.5rem',
        screens: {
          '2xl': '1200px',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    // Custom plugin for component utilities
    function({ addUtilities }) {
      addUtilities({
        '.spine-container': {
          maxWidth: '1200px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
        },
        '.spine-section': {
          paddingTop: '6rem',
          paddingBottom: '6rem',
        },
        '.spine-rule': {
          borderTop: '1px solid var(--border-color, #3A3A3A)',
        },
        '.spine-label': {
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '0.75rem',
          color: 'var(--text-secondary, #AAAAAA)',
        },
        '.candlefish-glow': {
          '&:hover': {
            boxShadow: '0 0 20px rgba(0, 206, 209, 0.4)',
          },
        },
        '.gradient-text': {
          background: 'linear-gradient(135deg, var(--accent, #00CED1), var(--text-secondary, #AAAAAA))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          display: 'inline-block',
        },
        '.skeleton': {
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          backgroundSize: '200px 100%',
          animation: 'skeleton 1.5s ease-in-out infinite',
        },
      })
    },
  ],
}
