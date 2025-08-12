import { useSelector } from 'react-redux';
import { useColorScheme } from 'react-native';
import { RootState } from '@/store';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

const lightTheme: ThemeColors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  accent: '#FF9500',
  background: '#FFFFFF',
  surface: '#F2F2F7',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
};

const darkTheme: ThemeColors = {
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  accent: '#FF9F0A',
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  success: '#32D74B',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',
};

export const useTheme = (): Theme => {
  const systemColorScheme = useColorScheme();
  const userPreference = useSelector((state: RootState) =>
    state.auth.user?.preferences?.theme
  );

  // Determine the active theme
  let isDark = false;

  if (userPreference === 'dark') {
    isDark = true;
  } else if (userPreference === 'light') {
    isDark = false;
  } else {
    // Follow system preference
    isDark = systemColorScheme === 'dark';
  }

  return {
    dark: isDark,
    colors: isDark ? darkTheme : lightTheme,
  };
};
