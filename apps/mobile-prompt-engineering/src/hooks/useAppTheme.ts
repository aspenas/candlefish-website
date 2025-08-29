import { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAppSelector } from './redux';
import { lightTheme, darkTheme } from '@/constants/theme';

export const useAppTheme = () => {
  const systemColorScheme = useColorScheme();
  const { settings } = useAppSelector((state) => state.settings);
  
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const themePreference = settings?.ui?.theme || 'auto';
    
    switch (themePreference) {
      case 'light':
        setIsDarkMode(false);
        break;
      case 'dark':
        setIsDarkMode(true);
        break;
      case 'auto':
      default:
        setIsDarkMode(systemColorScheme === 'dark');
        break;
    }
  }, [systemColorScheme, settings?.ui?.theme]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  return {
    theme,
    isDarkMode,
    systemColorScheme
  };
};