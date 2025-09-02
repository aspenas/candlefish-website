import { Theme } from '../types';

const commonSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const commonBorderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
};

const commonFontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    secondary: '#64748B',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    info: '#3B82F6',
  },
  spacing: commonSpacing,
  borderRadius: commonBorderRadius,
  fontSize: commonFontSize,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    primary: '#60A5FA',
    primaryDark: '#3B82F6',
    secondary: '#94A3B8',
    accent: '#FBBF24',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    error: '#F87171',
    warning: '#FBBF24',
    success: '#34D399',
    info: '#60A5FA',
  },
  spacing: commonSpacing,
  borderRadius: commonBorderRadius,
  fontSize: commonFontSize,
};

export const getTheme = (mode: 'light' | 'dark' | 'auto'): Theme => {
  if (mode === 'auto') {
    // In a real app, you'd check system appearance
    // For now, default to light
    return lightTheme;
  }
  
  return mode === 'dark' ? darkTheme : lightTheme;
};