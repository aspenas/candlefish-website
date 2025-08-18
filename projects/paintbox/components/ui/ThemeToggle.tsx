import React from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    const stored = localStorage.getItem('pb-theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('theme-dark');
      setIsDark(true);
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('theme-dark');
      localStorage.setItem('pb-theme', 'dark');
    } else {
      document.documentElement.classList.remove('theme-dark');
      localStorage.setItem('pb-theme', 'light');
    }
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-[8px] border border-[var(--color-paintbox-border)] bg-[var(--color-paintbox-surface)] hover:brightness-95"
      aria-label="Toggle dark mode"
    >
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
