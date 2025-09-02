module.exports = {
  theme: {
    extend: {
      colors: {
        ink: 'var(--mad-color-ink, var(--mad-ink))',
        bone: 'var(--mad-color-bone, var(--mad-bone))',
        bronze: 'var(--mad-color-bronze, var(--mad-bronze))',
        midnight: 'var(--mad-color-midnight, var(--mad-midnight))',
        slate: 'var(--mad-color-slate, var(--mad-slate))',
        stone: 'var(--mad-color-stone, var(--mad-stone))'
      },
      borderRadius: {
        lg: 'var(--mad-radius-lg, 12px)',
        xl: 'var(--mad-radius-xl, 16px)',
        '2xl': 'var(--mad-radius-2xl, 24px)'
      },
      boxShadow: {
        brand: 'var(--mad-shadow-soft, 0 12px 30px rgba(0,0,0,0.08))'
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "Times", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans"]
      }
    }
  }
}
