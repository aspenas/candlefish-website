import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Color palette specifically designed for security applications
export const SecurityColors = {
  // Primary colors
  primary: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main red
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Background colors (dark theme optimized)
  background: {
    primary: '#0f172a',    // Slate 900 - Main background
    secondary: '#1e293b',  // Slate 800 - Card background
    tertiary: '#334155',   // Slate 700 - Elevated elements
    surface: '#475569',    // Slate 600 - Input backgrounds
  },
  
  // Text colors
  text: {
    primary: '#f8fafc',    // Slate 50 - Primary text
    secondary: '#cbd5e1',  // Slate 300 - Secondary text
    tertiary: '#94a3b8',   // Slate 400 - Tertiary text
    disabled: '#64748b',   // Slate 500 - Disabled text
    inverse: '#0f172a',    // Dark text on light backgrounds
  },
  
  // Status/severity colors
  severity: {
    critical: '#dc2626',   // Red 600
    high: '#ea580c',       // Orange 600
    medium: '#d97706',     // Amber 600
    low: '#65a30d',        // Lime 600
    info: '#2563eb',       // Blue 600
  },
  
  // Alert type colors
  alerts: {
    malware: '#dc2626',      // Red
    phishing: '#ea580c',     // Orange
    ddos: '#d97706',         // Amber
    intrusion: '#dc2626',    // Red
    suspicious: '#2563eb',   // Blue
    vulnerability: '#7c3aed', // Violet
  },
  
  // Interactive colors
  interactive: {
    accent: '#06b6d4',       // Cyan 500 - Links, buttons
    success: '#10b981',      // Emerald 500 - Success states
    warning: '#f59e0b',      // Amber 500 - Warning states
    error: '#ef4444',        // Red 500 - Error states
    focus: '#3b82f6',        // Blue 500 - Focus states
  },
  
  // Border colors
  border: {
    primary: '#334155',      // Slate 700
    secondary: '#475569',    // Slate 600
    accent: '#ef4444',       // Red 500
    focus: '#3b82f6',        // Blue 500
  },
  
  // Overlay colors
  overlay: {
    light: 'rgba(15, 23, 42, 0.8)',    // Dark overlay
    medium: 'rgba(15, 23, 42, 0.9)',   // Darker overlay
    heavy: 'rgba(15, 23, 42, 0.95)',   // Darkest overlay
  },
  
  // Chart colors (for data visualization)
  chart: {
    primary: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22d3ee', '#a855f7', '#ec4899'],
    threat: ['#dc2626', '#ea580c', '#d97706', '#ca8a04'],
    status: ['#10b981', '#f59e0b', '#ef4444', '#6b7280'],
  }
};

// Typography system
export const Typography = {
  // Font families
  fonts: {
    regular: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
    }),
    medium: Platform.select({
      ios: 'SF Pro Display Medium',
      android: 'Roboto Medium',
    }),
    bold: Platform.select({
      ios: 'SF Pro Display Bold',
      android: 'Roboto Bold',
    }),
    mono: Platform.select({
      ios: 'SF Mono',
      android: 'Roboto Mono',
    }),
  },
  
  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Font weights
  weights: {
    light: '300' as any,
    regular: '400' as any,
    medium: '500' as any,
    semibold: '600' as any,
    bold: '700' as any,
  },
};

// Spacing system
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

// Border radius system
export const BorderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// Shadow system (optimized for dark theme)
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
  },
};

// Animation timings
export const Animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    ease: 'ease' as any,
    easeIn: 'ease-in' as any,
    easeOut: 'ease-out' as any,
    easeInOut: 'ease-in-out' as any,
  },
};

// Layout dimensions
export const Layout = {
  screen: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  isTablet: width >= 768,
  header: {
    height: Platform.select({ ios: 88, android: 64 }),
  },
  tabBar: {
    height: Platform.select({ ios: 83, android: 64 }),
  },
  statusBar: {
    height: Platform.select({ ios: 44, android: 24 }),
  },
};

// Component styles
export const ComponentStyles = {
  // Card styles
  card: {
    backgroundColor: SecurityColors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
  },
  
  // Button styles
  button: {
    primary: {
      backgroundColor: SecurityColors.primary[500],
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
    secondary: {
      backgroundColor: SecurityColors.background.tertiary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
    danger: {
      backgroundColor: SecurityColors.interactive.error,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
  },
  
  // Input styles
  input: {
    backgroundColor: SecurityColors.background.surface,
    borderColor: SecurityColors.border.primary,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    color: SecurityColors.text.primary,
    fontSize: Typography.sizes.base,
  },
  
  // Badge styles
  badge: {
    critical: {
      backgroundColor: SecurityColors.severity.critical,
      color: SecurityColors.text.primary,
    },
    high: {
      backgroundColor: SecurityColors.severity.high,
      color: SecurityColors.text.primary,
    },
    medium: {
      backgroundColor: SecurityColors.severity.medium,
      color: SecurityColors.text.primary,
    },
    low: {
      backgroundColor: SecurityColors.severity.low,
      color: SecurityColors.text.primary,
    },
  },
};

// Utility functions
export const SecurityThemeUtils = {
  // Get color by severity level
  getSeverityColor: (severity: 'critical' | 'high' | 'medium' | 'low') => {
    return SecurityColors.severity[severity];
  },
  
  // Get alert type color
  getAlertTypeColor: (type: keyof typeof SecurityColors.alerts) => {
    return SecurityColors.alerts[type] || SecurityColors.interactive.accent;
  },
  
  // Create responsive spacing
  getResponsiveSpacing: (base: number) => {
    return Layout.isSmallDevice ? base * 0.8 : base;
  },
  
  // Create responsive font size
  getResponsiveFontSize: (base: number) => {
    return Layout.isSmallDevice ? base * 0.9 : base;
  },
  
  // Create opacity variants
  withOpacity: (color: string, opacity: number) => {
    return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  },
  
  // Check if color is light or dark
  isLightColor: (color: string) => {
    // Simple implementation - can be enhanced
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 128;
  },
};

// Theme object combining all styles
export const SecurityTheme = {
  colors: SecurityColors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  animations: Animations,
  layout: Layout,
  components: ComponentStyles,
  utils: SecurityThemeUtils,
};

export default SecurityTheme;