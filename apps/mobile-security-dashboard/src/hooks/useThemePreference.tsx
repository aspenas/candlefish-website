import { useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import { secureStorage } from '@/utils/secure-storage';

type ThemePreference = 'light' | 'dark' | 'system';

interface UseThemePreferenceReturn {
  themePreference: ThemePreference;
  currentTheme: 'light' | 'dark';
  setThemePreference: (theme: ThemePreference) => Promise<void>;
}

export const useThemePreference = (): UseThemePreferenceReturn => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() || 'light'
  );

  useEffect(() => {
    loadThemePreference();
    
    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themePreference === 'system') {
        setCurrentTheme(colorScheme || 'light');
      }
    });

    return () => subscription?.remove();
  }, [themePreference]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await secureStorage.getItem('theme_preference') as ThemePreference;
      if (savedTheme) {
        setThemePreferenceState(savedTheme);
        updateCurrentTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const updateCurrentTheme = (preference: ThemePreference) => {
    if (preference === 'system') {
      setCurrentTheme(Appearance.getColorScheme() || 'light');
    } else {
      setCurrentTheme(preference);
    }
  };

  const setThemePreference = async (theme: ThemePreference) => {
    try {
      setThemePreferenceState(theme);
      updateCurrentTheme(theme);
      await secureStorage.setItem('theme_preference', theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return {
    themePreference,
    currentTheme,
    setThemePreference,
  };
};

export default useThemePreference;