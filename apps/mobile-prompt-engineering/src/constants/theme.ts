import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

// Candlefish brand colors
const brandColors = {
  primary: '#1E40AF',
  primaryVariant: '#3B82F6',
  secondary: '#7C3AED',
  secondaryVariant: '#8B5CF6',
  tertiary: '#059669',
  tertiaryVariant: '#10B981',
  success: '#059669',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#0EA5E9'
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#E0E7FF',
    onPrimaryContainer: '#1E3A8A',
    secondary: brandColors.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#EDE9FE',
    onSecondaryContainer: '#581C87',
    tertiary: brandColors.tertiary,
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#D1FAE5',
    onTertiaryContainer: '#064E3B',
    error: brandColors.error,
    onError: '#FFFFFF',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#991B1B',
    background: '#FAFAFA',
    onBackground: '#1F2937',
    surface: '#FFFFFF',
    onSurface: '#1F2937',
    surfaceVariant: '#F3F4F6',
    onSurfaceVariant: '#6B7280',
    outline: '#D1D5DB',
    outlineVariant: '#E5E7EB',
    // Custom colors
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    codeBackground: '#F8FAFC',
    codeBorder: '#E2E8F0',
    promptCard: '#FFFFFF',
    metricCard: '#F8FAFC',
    dangerBackground: '#FEF2F2',
    dangerBorder: '#FECACA'
  }
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brandColors.primaryVariant,
    onPrimary: '#FFFFFF',
    primaryContainer: '#1E40AF',
    onPrimaryContainer: '#DBEAFE',
    secondary: brandColors.secondaryVariant,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#7C3AED',
    onSecondaryContainer: '#EDE9FE',
    tertiary: brandColors.tertiaryVariant,
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#059669',
    onTertiaryContainer: '#D1FAE5',
    error: '#EF4444',
    onError: '#FFFFFF',
    errorContainer: '#DC2626',
    onErrorContainer: '#FEE2E2',
    background: '#0F172A',
    onBackground: '#F1F5F9',
    surface: '#1E293B',
    onSurface: '#F1F5F9',
    surfaceVariant: '#334155',
    onSurfaceVariant: '#CBD5E1',
    outline: '#64748B',
    outlineVariant: '#475569',
    // Custom colors
    success: brandColors.tertiaryVariant,
    warning: '#FBBF24',
    info: '#38BDF8',
    codeBackground: '#0F172A',
    codeBorder: '#334155',
    promptCard: '#1E293B',
    metricCard: '#334155',
    dangerBackground: '#7F1D1D',
    dangerBorder: '#B91C1C'
  }
};

// Navigation themes
export const lightNavigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: lightTheme.colors.primary,
    background: lightTheme.colors.background,
    card: lightTheme.colors.surface,
    text: lightTheme.colors.onSurface,
    border: lightTheme.colors.outline,
    notification: lightTheme.colors.error
  }
};

export const darkNavigationTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: darkTheme.colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.surface,
    text: darkTheme.colors.onSurface,
    border: darkTheme.colors.outline,
    notification: darkTheme.colors.error
  }
};

// Typography
export const typography = {
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    fontWeight: '400' as const
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    fontWeight: '400' as const
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '400' as const
  },
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '600' as const
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600' as const
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500' as const
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as const
  },
  code: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
    fontWeight: '400' as const
  }
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

// Border radius
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999
};

// Shadows
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8
  }
};

// Animation easing
export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out'
} as const;