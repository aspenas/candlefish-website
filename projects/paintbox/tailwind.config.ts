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
        // Legacy support
        background: 'var(--background)',
        foreground: 'var(--foreground)',

        // Eggshell Design System
        eggshell: {
          primary: '#fefaee',
          50: '#fffef2',
          100: '#fefbec',
          200: '#fefaed',
          300: '#fdfaee',
          400: '#fdfbf0',
        },
        brown: {
          primary: '#6d634f', // Darker for better contrast
          50: '#f7f5f2',
          100: '#e8e1d7',
          200: '#9a8b78', // Darker for 3:1 border contrast
          300: '#8a7a64', // Darker for AA compliance on text
          400: '#6d634f', // Updated primary
          500: '#5a5142', // Darker for secondary text compliance
          600: '#4a4335',
          700: '#3a3529',
          800: '#2a261d',
        },

        // Semantic color system
        surface: {
          primary: '#ffffff',
          secondary: '#fefbec',
          elevated: '#ffffff',
        },
        text: {
          primary: '#3a3529', // brown-700 for maximum readability
          secondary: '#5a5142', // brown-500 for AA compliance
          tertiary: '#8a7a64', // brown-300 for subtle content
          inverse: '#ffffff',
          link: '#4a4335', // brown-600 for strong link contrast
        },
        border: {
          primary: '#9a8b78', // brown-200 for 3:1 border contrast
          secondary: '#fdfbf0',
          focus: '#6d634f', // brown-400 for sufficient focus contrast
        },
        interactive: {
          primary: {
            DEFAULT: '#6d634f', // brown-primary for sufficient contrast
            hover: '#4a4335', // brown-600
            active: '#3a3529', // brown-700
            disabled: '#9a8b78', // brown-200
          },
          secondary: {
            DEFAULT: '#fefaed',
            hover: '#fdfaee',
            active: '#fdfbf0',
          },
        },

        // Legacy colors (updated for WCAG compliance)
        eggshell_legacy: {
          brand: '#6d634f',
          'brand-600': '#4a4335',
          'brand-500': '#5a5142',
          'brand-400': '#6d634f',
          accent: '#6d634f',
          'accent-2': '#6d634f',
          background: '#fefaee',
          surface: '#ffffff',
          overlay: '#ffffff',
          text: '#3a3529',
          'text-muted': '#5a5142',
          border: '#9a8b78',
          error: '#dc2626',
          success: '#065f46', // Darker green for AA compliance
          warning: '#92400e', // Darker amber for AA compliance
          primary: '#6d634f',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        serif: ['Charter', 'Times New Roman', 'serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Consolas', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'eggshell-sm': '0 1px 2px 0 rgba(155, 139, 115, 0.1)',
        'eggshell-md': '0 4px 6px -1px rgba(155, 139, 115, 0.1), 0 2px 4px -1px rgba(155, 139, 115, 0.06)',
        'eggshell-lg': '0 10px 15px -3px rgba(155, 139, 115, 0.1), 0 4px 6px -2px rgba(155, 139, 115, 0.05)',
        'eggshell-xl': '0 20px 25px -5px rgba(155, 139, 115, 0.1), 0 10px 10px -5px rgba(155, 139, 115, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'gentle-bounce': 'gentleBounce 0.6s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
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
        gentleBounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
