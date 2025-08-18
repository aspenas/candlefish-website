import type { Config } from 'tailwindcss'
import preset from '@candlefish/tailwind-preset';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [preset],
  theme: { extend: {} },
  plugins: []
} satisfies Config
