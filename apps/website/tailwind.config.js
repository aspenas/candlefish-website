/** @type {import('tailwindcss').Config} */

// Import the Candlefish theme directly
const candlefishTheme = require('./candlefish-design-system/packages/tokens/build/tailwind/theme.js');
const candlefishComponents = require('./candlefish-design-system/packages/tokens/build/tailwind/components.js');

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Merge Candlefish design system
      ...candlefishTheme,

      // Keep existing animations and utilities
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
      container: {
        center: true,
        padding: '1.5rem',
        screens: {
          '2xl': '1440px'
        }
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('tailwind-scrollbar')({ nocompatible: true }),
    candlefishComponents, // Add Candlefish component classes
  ],
}
