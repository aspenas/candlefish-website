module.exports = {
  theme: {
    extend: {
      colors: {
        charcoal: 'var(--cf-color-charcoal, var(--cf-charcoal))',
        warmwhite: 'var(--cf-color-warm-white, var(--cf-warm-white))',
        amber: 'var(--cf-color-amber, var(--cf-amber))',
        indigo: 'var(--cf-color-deep-indigo, var(--cf-deep-indigo))',
        slate: 'var(--cf-color-slate, var(--cf-slate))',
        sand: 'var(--cf-color-muted-sand, var(--cf-muted-sand))'
      },
      borderRadius: {
        lg: 'var(--cf-radius-lg, 12px)',
        xl: 'var(--cf-radius-xl, 16px)',
        '2xl': 'var(--cf-radius-2xl, 24px)'
      },
      boxShadow: {
        brand: 'var(--cf-shadow-soft, 0 12px 30px rgba(0,0,0,0.08))'
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'Times', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans']
      }
    }
  }
}
