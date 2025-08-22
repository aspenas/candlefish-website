/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#020617',
        foreground: '#f1f5f9',
        border: '#1e293b',
        input: '#1e293b',
        ring: '#3b82f6',
        card: {
          DEFAULT: '#0f172a',
          foreground: '#f1f5f9',
        },
        primary: {
          DEFAULT: '#3b82f6',
          foreground: '#f1f5f9',
        },
        secondary: {
          DEFAULT: '#1e293b',
          foreground: '#f1f5f9',
        },
        muted: {
          DEFAULT: '#1e293b',
          foreground: '#94a3b8',
        },
        accent: {
          DEFAULT: '#3b82f6',
          foreground: '#f1f5f9',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#f1f5f9',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.25rem',
        sm: '0.125rem',
      },
    },
  },
  plugins: [],
}
