import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  Theme,
  CssBaseline,
} from '@mui/material';
import { darkTheme, lightTheme } from '@/theme/theme';

// Theme context type
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: Theme;
}

// Theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Props for ThemeProvider
interface ThemeProviderProps {
  children: ReactNode;
}

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Security dashboard defaults to dark mode for SOC environments
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for user preference, default to dark
    const savedTheme = localStorage.getItem('security-dashboard-theme');
    return savedTheme ? savedTheme === 'dark' : true; // Default to dark for SOC
  });

  // Get current theme based on mode
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('security-dashboard-theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  // Apply theme changes to document for consistency
  useEffect(() => {
    const root = document.documentElement;

    if (isDarkMode) {
      root.style.setProperty('--background-color', '#0a0a0a');
      root.style.setProperty('--surface-color', '#1a1a1a');
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--border-color', '#333333');
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.style.setProperty('--background-color', '#fafafa');
      root.style.setProperty('--surface-color', '#ffffff');
      root.style.setProperty('--text-color', '#212121');
      root.style.setProperty('--border-color', '#e0e0e0');
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDarkMode ? '#1a1a1a' : '#1976d2');
    }
  }, [isDarkMode]);

  // Listen for system theme changes (optional feature)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't explicitly set a preference
      const savedTheme = localStorage.getItem('security-dashboard-theme');
      if (!savedTheme) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const contextValue: ThemeContextType = {
    isDarkMode,
    toggleTheme,
    theme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
