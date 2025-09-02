/**
 * Theme Context
 * Manages app theme and appearance settings
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '@/types';

// Light theme colors
const lightTheme: Theme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#6D6D70',
    border: '#C6C6C8',
    error: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759',
    info: '#007AFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 38,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 30,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 20,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 18,
    },
  },
  borderRadius: 8,
  shadows: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

// Dark theme colors
const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    error: '#FF453A',
    warning: '#FF9F0A',
    success: '#32D74B',
    info: '#64D2FF',
  },
  shadows: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@collaboration_theme_mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  // Initialize theme from storage
  useEffect(() => {
    loadThemeFromStorage();
  }, []);

  // Update theme when system appearance changes
  useEffect(() => {
    if (themeMode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode]);

  // Listen for appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === 'auto') {
        setIsDark(colorScheme === 'dark');
      }
    });

    return () => subscription?.remove();
  }, [themeMode]);

  const loadThemeFromStorage = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        const mode = storedTheme as ThemeMode;
        setThemeModeState(mode);
        
        if (mode === 'light') {
          setIsDark(false);
        } else if (mode === 'dark') {
          setIsDark(true);
        } else {
          setIsDark(systemColorScheme === 'dark');
        }
      }
    } catch (error) {
      console.error('Failed to load theme from storage:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode): Promise<void> => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      
      if (mode === 'light') {
        setIsDark(false);
      } else if (mode === 'dark') {
        setIsDark(true);
      } else {
        setIsDark(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Failed to set theme mode:', error);
    }
  };

  const toggleTheme = async (): Promise<void> => {
    const newMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  const theme = isDark ? darkTheme : lightTheme;

  const contextValue: ThemeContextType = {
    theme,
    isDark,
    themeMode,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};