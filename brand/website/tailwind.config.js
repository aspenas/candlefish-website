/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ARCHITECTURAL NEUTRALS */
        'atelier-canvas': 'rgb(var(--atelier-canvas) / <alpha-value>)',
        'atelier-structure': 'rgb(var(--atelier-structure) / <alpha-value>)',
        'atelier-depth': 'rgb(var(--atelier-depth) / <alpha-value>)',

        /* PRECISION INKS */
        'ink-primary': 'rgb(var(--ink-primary) / <alpha-value>)',
        'ink-secondary': 'rgb(var(--ink-secondary) / <alpha-value>)',
        'ink-tertiary': 'rgb(var(--ink-tertiary) / <alpha-value>)',

        /* OPERATIONAL ACCENTS */
        'operation-active': 'rgb(var(--operation-active) / <alpha-value>)',
        'operation-pending': 'rgb(var(--operation-pending) / <alpha-value>)',
        'operation-complete': 'rgb(var(--operation-complete) / <alpha-value>)',

        /* MATERIAL TONES */
        'material-concrete': 'rgb(var(--material-concrete) / <alpha-value>)',
        'material-steel': 'rgb(var(--material-steel) / <alpha-value>)',

        /* WORKSHOP/ARCHIVE THEME */
        'pearl': 'rgb(var(--color-pearl) / <alpha-value>)',
        'copper': 'rgb(var(--color-copper) / <alpha-value>)',
        'living-cyan': 'rgb(var(--color-living-cyan) / <alpha-value>)',
        'graphite': 'rgb(var(--color-graphite) / <alpha-value>)',

        /* JONY IVE REFINED PALETTE */
        'nearBlack': '#0A0A0B',
        'charcoal': '#1A1A1C',
        'livingCyan': '#3FD3C6',
      },
      fontFamily: {
        'display': ['Druk Wide', 'Suisse Works', 'system-ui', 'sans-serif'],
        'sans': ['Suisse Works', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        'editorial': ['Tiempos Text', 'Georgia', 'serif'],
        'mono': ['Decimal Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': 'var(--type-xs)',
        'sm': 'var(--type-sm)',
        'base': 'var(--type-base)',
        'md': 'var(--type-md)',
        'lg': 'var(--type-lg)',
        'xl': 'var(--type-xl)',
        '2xl': 'var(--type-2xl)',
        '3xl': 'var(--type-3xl)',
      },
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        '4xl': 'var(--space-4xl)',
      },
      animation: {
        'expand-h': 'expand-horizontally var(--duration-swift) var(--ease-swift)',
        'reveal-v': 'reveal-vertically var(--duration-gentle) var(--ease-gentle)',
        'fade-up': 'fade-up var(--duration-gentle) var(--ease-gentle)',
      },
      keyframes: {
        'expand-horizontally': {
          'from': {
            transform: 'scaleX(0)',
            transformOrigin: 'left',
          },
          'to': {
            transform: 'scaleX(1)',
          }
        },
        'reveal-vertically': {
          'from': {
            clipPath: 'inset(100% 0 0 0)',
          },
          'to': {
            clipPath: 'inset(0 0 0 0)',
          }
        },
        'fade-up': {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          }
        }
      },
      transitionTimingFunction: {
        'swift': 'var(--ease-swift)',
        'gentle': 'var(--ease-gentle)',
        'dramatic': 'var(--ease-dramatic)',
      },
      transitionDuration: {
        'instant': 'var(--duration-instant)',
        'swift': 'var(--duration-swift)',
        'gentle': 'var(--duration-gentle)',
        'dramatic': 'var(--duration-dramatic)',
      },
      gridTemplateColumns: {
        'atelier': `[full-start] minmax(20px, 1fr)
                    [wide-start] minmax(0, 80px)
                    [main-start] minmax(0, 80px)
                    [text-start] minmax(20px, 740px) [text-end]
                    minmax(20px, 140px) [main-end]
                    minmax(20px, 220px) [wide-end]
                    minmax(20px, 1fr) [full-end]`,
        'atelier-mobile': `[full-start] 20px
                          [wide-start main-start text-start] 1fr
                          [text-end main-end wide-end] 20px [full-end]`,
      },
      letterSpacing: {
        'display-3xl': '-0.04em',
        'display-2xl': '-0.03em',
        'display-xl': '-0.02em',
        'display-lg': '-0.01em',
        'mono-xs': '0.03em',
      },
      lineHeight: {
        'display': '0.85',
        'editorial': '1.6',
      },
      borderRadius: {
        'none': '0',
        'sharp': '0',
      },
      backgroundImage: {
        'atmosphere-dawn': 'linear-gradient(180deg, rgb(var(--atelier-canvas)) 0%, rgb(255 245 230) 100%)',
        'atmosphere-noon': 'linear-gradient(180deg, rgb(var(--atelier-canvas)) 0%, rgb(var(--atelier-canvas)) 100%)',
        'atmosphere-dusk': 'linear-gradient(180deg, rgb(var(--atelier-canvas)) 0%, rgb(245 240 232) 100%)',
        'atmosphere-night': 'linear-gradient(180deg, rgb(250 248 244) 0%, rgb(232 229 223) 100%)',
      },
      backdropFilter: {
        'glass': 'blur(10px)',
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
}
