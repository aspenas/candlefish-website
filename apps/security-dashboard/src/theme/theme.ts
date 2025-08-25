import { createTheme, ThemeOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// Security-focused color palette optimized for SOC environments
const securityColors = {
  // Primary security colors
  critical: '#d32f2f',    // Critical threats/vulnerabilities
  high: '#f57c00',        // High severity issues
  medium: '#fbc02d',      // Medium severity warnings
  low: '#388e3c',         // Low severity or resolved
  info: '#1976d2',        // Informational
  
  // Status colors
  healthy: '#2e7d32',     // Green for healthy assets
  warning: '#f57c00',     // Orange for warnings
  error: '#d32f2f',       // Red for errors/critical
  unknown: '#757575',     // Gray for unknown status
  
  // SOC-optimized dark palette
  background: {
    primary: '#0a0a0a',    // Deep black for primary background
    secondary: '#1a1a1a',  // Dark gray for cards/surfaces
    tertiary: '#2a2a2a',   // Lighter gray for elevated surfaces
  },
  
  // High contrast text for readability
  text: {
    primary: '#ffffff',     // Pure white for primary text
    secondary: '#b3b3b3',   // Light gray for secondary text
    disabled: '#666666',    // Medium gray for disabled text
  },
  
  // Border and divider colors
  divider: '#333333',
  border: '#404040',
  
  // Kong-specific status colors
  kong: {
    secure: '#2e7d32',      // Green for secure Kong API
    vulnerable: '#d32f2f',   // Red for vulnerable Kong API
    warning: '#f57c00',      // Orange for Kong warnings
  },
};

// Common theme options
const commonThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    
    // Improved typography hierarchy for dashboards
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    
    // Body text optimized for readability
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    
    // Monospace for technical data
    caption: {
      fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
      fontSize: '0.75rem',
    },
  },
  
  spacing: 8, // 8px base spacing unit
  
  shape: {
    borderRadius: 8,
  },
  
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  
  components: {
    // Global component overrides
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: securityColors.background.secondary,
          },
          '&::-webkit-scrollbar-thumb': {
            background: securityColors.border,
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#505050',
          },
        },
      },
    },
    
    // Paper component for cards and surfaces
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
        },
        elevation2: {
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
        },
        elevation4: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        },
      },
    },
    
    // Button component
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
        },
        containedPrimary: {
          boxShadow: '0 2px 4px rgba(25, 118, 210, 0.3)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(25, 118, 210, 0.4)',
          },
        },
      },
    },
    
    // Card component
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${securityColors.border}`,
        },
      },
    },
    
    // Chip component for tags and status indicators
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        colorError: {
          backgroundColor: alpha(securityColors.critical, 0.2),
          color: securityColors.critical,
          '& .MuiChip-deleteIcon': {
            color: securityColors.critical,
          },
        },
        colorWarning: {
          backgroundColor: alpha(securityColors.high, 0.2),
          color: securityColors.high,
        },
        colorSuccess: {
          backgroundColor: alpha(securityColors.healthy, 0.2),
          color: securityColors.healthy,
        },
      },
    },
    
    // Table components for data grids
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: securityColors.background.tertiary,
        },
      },
    },
    
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(securityColors.text.secondary, 0.05),
          },
        },
      },
    },
    
    // Alert component for notifications
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardError: {
          backgroundColor: alpha(securityColors.critical, 0.1),
          border: `1px solid ${alpha(securityColors.critical, 0.3)}`,
        },
        standardWarning: {
          backgroundColor: alpha(securityColors.high, 0.1),
          border: `1px solid ${alpha(securityColors.high, 0.3)}`,
        },
        standardSuccess: {
          backgroundColor: alpha(securityColors.healthy, 0.1),
          border: `1px solid ${alpha(securityColors.healthy, 0.3)}`,
        },
        standardInfo: {
          backgroundColor: alpha(securityColors.info, 0.1),
          border: `1px solid ${alpha(securityColors.info, 0.3)}`,
        },
      },
    },
  },
};

// Dark theme optimized for Security Operations Centers
export const darkTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: securityColors.info,
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#90caf9',
      light: '#bbdefb',
      dark: '#64b5f6',
      contrastText: '#000000',
    },
    error: {
      main: securityColors.critical,
      light: '#ef5350',
      dark: '#c62828',
      contrastText: '#ffffff',
    },
    warning: {
      main: securityColors.high,
      light: '#ff9800',
      dark: '#f57c00',
      contrastText: '#000000',
    },
    success: {
      main: securityColors.healthy,
      light: '#4caf50',
      dark: '#2e7d32',
      contrastText: '#ffffff',
    },
    info: {
      main: securityColors.info,
      light: '#2196f3',
      dark: '#1976d2',
      contrastText: '#ffffff',
    },
    background: {
      default: securityColors.background.primary,
      paper: securityColors.background.secondary,
    },
    text: {
      primary: securityColors.text.primary,
      secondary: securityColors.text.secondary,
      disabled: securityColors.text.disabled,
    },
    divider: securityColors.divider,
    
    // Custom security colors
    ...(securityColors as any),
  },
  
  components: {
    ...commonThemeOptions.components,
    
    // Dark-specific component overrides
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: securityColors.background.secondary,
          borderBottom: `1px solid ${securityColors.border}`,
        },
      },
    },
    
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: securityColors.background.secondary,
          borderRight: `1px solid ${securityColors.border}`,
        },
      },
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: securityColors.border,
            },
            '&:hover fieldset': {
              borderColor: '#505050',
            },
          },
        },
      },
    },
  },
});

// Light theme (fallback, primarily dark-focused for SOC)
export const lightTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'light',
    primary: {
      main: securityColors.info,
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#666666',
    },
  },
});

// Default theme (dark for security dashboard)
export const theme = darkTheme;

// Severity color mapping helper
export const getSeverityColor = (severity: string): string => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return securityColors.critical;
    case 'HIGH':
      return securityColors.high;
    case 'MEDIUM':
      return securityColors.medium;
    case 'LOW':
      return securityColors.low;
    default:
      return securityColors.info;
  }
};

// Health status color mapping helper
export const getHealthStatusColor = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'HEALTHY':
      return securityColors.healthy;
    case 'WARNING':
      return securityColors.warning;
    case 'CRITICAL':
    case 'ERROR':
      return securityColors.error;
    case 'UNKNOWN':
      return securityColors.unknown;
    default:
      return securityColors.unknown;
  }
};

// Alert status color mapping helper
export const getAlertStatusColor = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return securityColors.critical;
    case 'ACKNOWLEDGED':
      return securityColors.high;
    case 'RESOLVED':
      return securityColors.healthy;
    case 'SUPPRESSED':
      return securityColors.unknown;
    default:
      return securityColors.info;
  }
};

// Kong security status color helper
export const getKongStatusColor = (isVulnerable: boolean, isSecure: boolean): string => {
  if (isVulnerable) return securityColors.kong.vulnerable;
  if (isSecure) return securityColors.kong.secure;
  return securityColors.kong.warning;
};

export default theme;