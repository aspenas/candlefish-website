import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark',
  storageKey = 'rtpm-theme'
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    let effectiveTheme: 'light' | 'dark';

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      effectiveTheme = systemTheme;
    } else {
      effectiveTheme = theme;
    }

    // Add the effective theme class
    root.classList.add(effectiveTheme);
    setActualTheme(effectiveTheme);

    // Save to localStorage
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      setActualTheme(systemTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  const themeConfig = {
    light: {
      icon: Sun,
      label: 'Light mode',
      color: 'text-yellow-500'
    },
    dark: {
      icon: Moon,
      label: 'Dark mode',
      color: 'text-blue-400'
    },
    system: {
      icon: Monitor,
      label: 'System preference',
      color: 'text-gray-400'
    }
  };

  const config = themeConfig[theme];
  const Icon = config.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg transition-all duration-200
        bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-gray-600
        backdrop-blur-sm shadow-lg
        ${className}
      `}
      title={config.label}
    >
      <motion.div
        key={theme}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 15 }}
        className={`${config.color}`}
      >
        <Icon className="w-5 h-5" />
      </motion.div>

      {/* Indicator for system theme */}
      {theme === 'system' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-gray-800"
        />
      )}
    </motion.button>
  );
};

// Responsive design utilities
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    }
    return { width: 1920, height: 1080 };
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const breakpoints = {
    xs: 480,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  };

  const isBreakpoint = (breakpoint: keyof typeof breakpoints) => {
    return windowSize.width >= breakpoints[breakpoint];
  };

  const isMobile = windowSize.width < breakpoints.md;
  const isTablet = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg;
  const isDesktop = windowSize.width >= breakpoints.lg;

  return {
    windowSize,
    isBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints
  };
};

// Responsive container component
export const ResponsiveContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
}> = ({ children, className = '', mobile, tablet, desktop }) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  let content = children;

  if (isMobile && mobile) {
    content = mobile;
  } else if (isTablet && tablet) {
    content = tablet;
  } else if (isDesktop && desktop) {
    content = desktop;
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
};

// Responsive grid component
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}> = ({ children, className = '', cols = { mobile: 1, tablet: 2, desktop: 3 } }) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  let gridCols = 'grid-cols-1';

  if (isMobile && cols.mobile) {
    gridCols = `grid-cols-${cols.mobile}`;
  } else if (isTablet && cols.tablet) {
    gridCols = `grid-cols-${cols.tablet}`;
  } else if (isDesktop && cols.desktop) {
    gridCols = `grid-cols-${cols.desktop}`;
  }

  return (
    <div className={`grid gap-4 ${gridCols} ${className}`}>
      {children}
    </div>
  );
};

// Mobile-first navigation component
export const MobileNavigation: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Navigation */}
      <motion.nav
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-md border-r border-gray-700 z-50 md:hidden overflow-y-auto"
      >
        <div className="p-6">
          {children}
        </div>
      </motion.nav>
    </>
  );
};

// Responsive sidebar component
export const ResponsiveSidebar: React.FC<{
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}> = ({ children, isOpen, onClose, className = '' }) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <MobileNavigation isOpen={isOpen} onClose={onClose}>
        {children}
      </MobileNavigation>
    );
  }

  // Desktop sidebar
  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 320 : 80 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`
        hidden md:flex flex-col h-full bg-gray-900/50 backdrop-blur-sm border-r border-gray-700
        ${className}
      `}
    >
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </motion.aside>
  );
};

// Adaptive card component
export const AdaptiveCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}> = ({ children, className = '', compact = false }) => {
  const { isMobile } = useResponsive();

  return (
    <motion.div
      layout
      className={`
        backdrop-blur-sm border rounded-xl transition-all duration-200
        ${isMobile || compact
          ? 'p-3 bg-gray-800/30 border-gray-700/50'
          : 'p-6 bg-gray-800/50 border-gray-700'
        }
        hover:border-gray-600 hover:shadow-lg hover:shadow-black/10
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

// Layout utilities for different screen sizes
export const getResponsiveLayout = (isMobile: boolean, isTablet: boolean) => {
  if (isMobile) {
    return {
      container: 'px-4 py-4',
      grid: 'grid-cols-1 gap-4',
      card: 'p-4',
      text: {
        title: 'text-xl',
        subtitle: 'text-sm',
        body: 'text-sm'
      },
      spacing: 'space-y-4',
      button: 'px-3 py-2 text-sm'
    };
  }

  if (isTablet) {
    return {
      container: 'px-6 py-6',
      grid: 'grid-cols-2 gap-6',
      card: 'p-5',
      text: {
        title: 'text-2xl',
        subtitle: 'text-base',
        body: 'text-base'
      },
      spacing: 'space-y-6',
      button: 'px-4 py-2 text-base'
    };
  }

  // Desktop
  return {
    container: 'px-8 py-8',
    grid: 'grid-cols-3 gap-8',
    card: 'p-6',
    text: {
      title: 'text-3xl',
      subtitle: 'text-lg',
      body: 'text-base'
    },
    spacing: 'space-y-8',
    button: 'px-6 py-3 text-base'
  };
};
