import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../types';
import { lightTheme, darkTheme, getTheme } from '../theme';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themeMode: 'light' | 'dark' | 'auto';
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'auto'>('auto');
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    initializeTheme();
    
    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  const initializeTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('@theme_mode');
      if (storedTheme && ['light', 'dark', 'auto'].includes(storedTheme)) {
        setThemeModeState(storedTheme as 'light' | 'dark' | 'auto');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const setThemeMode = async (mode: 'light' | 'dark' | 'auto') => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('@theme_mode', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
  };

  // Determine which theme to use
  const getActiveTheme = (): Theme => {
    if (themeMode === 'auto') {
      return systemTheme === 'dark' ? darkTheme : lightTheme;
    }
    return getTheme(themeMode);
  };

  const theme = getActiveTheme();
  const isDark = theme.mode === 'dark';

  const value: ThemeContextType = {
    theme,
    isDark,
    themeMode,
    toggleTheme,
    setThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};