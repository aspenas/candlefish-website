// Color contrast validation for the existing design system

import { getContrastRatio, meetsContrastRequirements } from './accessibility';

// Extract RGB values from CSS custom properties
const colors = {
  // Backgrounds
  depthVoid: '#0D1B2A',      // --depth-void: 13 27 42
  depthOcean: '#1B263B',     // --depth-ocean: 27 38 59
  depthSteel: '#1C1C1C',     // --depth-steel: 28 28 28
  depthGraphite: '#415A77',  // --depth-graphite: 65 90 119

  // Text colors
  lightPrimary: '#F8F8F2',   // --light-primary: 248 248 242
  lightSecondary: '#E0E1DD', // --light-secondary: 224 225 221
  lightTertiary: '#415A77',  // --light-tertiary: 65 90 119

  // Operational colors
  operationActive: '#3FD3C6',    // --operation-active: 63 211 198
  operationProcessing: '#69A3B0', // --operation-processing: 105 163 176
  operationComplete: '#8AC926',   // --operation-complete: 138 201 38
  operationAlert: '#FFA600',     // --operation-alert: 255 166 0

  // Interface colors
  interfaceHover: '#4FE3D6',     // --interface-hover: 79 227 214
  interfaceFocus: '#3FD3C6',     // --interface-focus: 63 211 198
};

// Archive page specific colors (from the component)
const archiveColors = {
  pearl: '#F8F8F2',    // equivalent to lightPrimary
  copper: '#3FD3C6',   // equivalent to operationActive
  livingCyan: '#3FD3C6', // same as copper
  graphite: '#415A77', // equivalent to depthGraphite
};

// Test common color combinations
export const colorContrastResults = {
  // Main text combinations
  primaryTextOnVoid: {
    foreground: colors.lightPrimary,
    background: colors.depthVoid,
    ratio: getContrastRatio(colors.lightPrimary, colors.depthVoid),
    passesAA: meetsContrastRequirements(colors.lightPrimary, colors.depthVoid, 'AA', 'normal'),
    passesAAA: meetsContrastRequirements(colors.lightPrimary, colors.depthVoid, 'AAA', 'normal'),
  },

  secondaryTextOnVoid: {
    foreground: colors.lightSecondary,
    background: colors.depthVoid,
    ratio: getContrastRatio(colors.lightSecondary, colors.depthVoid),
    passesAA: meetsContrastRequirements(colors.lightSecondary, colors.depthVoid, 'AA', 'normal'),
    passesAAA: meetsContrastRequirements(colors.lightSecondary, colors.depthVoid, 'AAA', 'normal'),
  },

  // Active/interactive elements
  activeOnVoid: {
    foreground: colors.operationActive,
    background: colors.depthVoid,
    ratio: getContrastRatio(colors.operationActive, colors.depthVoid),
    passesAA: meetsContrastRequirements(colors.operationActive, colors.depthVoid, 'AA', 'normal'),
    passesAAA: meetsContrastRequirements(colors.operationActive, colors.depthVoid, 'AAA', 'normal'),
  },

  // Archive page specific
  pearlOnGraphite: {
    foreground: archiveColors.pearl,
    background: archiveColors.graphite,
    ratio: getContrastRatio(archiveColors.pearl, archiveColors.graphite),
    passesAA: meetsContrastRequirements(archiveColors.pearl, archiveColors.graphite, 'AA', 'normal'),
    passesAAA: meetsContrastRequirements(archiveColors.pearl, archiveColors.graphite, 'AAA', 'normal'),
  },

  copperOnVoid: {
    foreground: archiveColors.copper,
    background: colors.depthVoid,
    ratio: getContrastRatio(archiveColors.copper, colors.depthVoid),
    passesAA: meetsContrastRequirements(archiveColors.copper, colors.depthVoid, 'AA', 'normal'),
    passesAAA: meetsContrastRequirements(archiveColors.copper, colors.depthVoid, 'AAA', 'normal'),
  },

  // Muted text combinations
  mutedTextOnVoid: {
    foreground: colors.lightTertiary,
    background: colors.depthVoid,
    ratio: getContrastRatio(colors.lightTertiary, colors.depthVoid),
    passesAA: meetsContrastRequirements(colors.lightTertiary, colors.depthVoid, 'AA', 'normal'),
    passesAAA: meetsContrastRequirements(colors.lightTertiary, colors.depthVoid, 'AAA', 'normal'),
  },

  // Button combinations
  darkTextOnActive: {
    foreground: colors.depthVoid,
    background: colors.operationActive,
    ratio: getContrastRatio(colors.depthVoid, colors.operationActive),
    passesAA: meetsContrastRequirements(colors.depthVoid, colors.operationActive, 'AA', 'normal'),
    passesAAA: meetsContrastRequirements(colors.depthVoid, colors.operationActive, 'AAA', 'normal'),
  },
};

// Function to log all contrast results
export function logContrastResults() {
  console.group('🎨 Color Contrast Analysis');

  Object.entries(colorContrastResults).forEach(([name, result]) => {
    const status = result.passesAAA ? '✅ AAA' : result.passesAA ? '⚠️ AA' : '❌ FAIL';
    console.log(`${status} ${name}: ${result.ratio.toFixed(2)}:1`);
    console.log(`   ${result.foreground} on ${result.background}`);
  });

  console.groupEnd();
}

// Export individual color values for use in components
export { colors, archiveColors };
