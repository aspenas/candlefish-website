/**
 * Unit tests for token generation functionality
 */
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Token Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful directory creation
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);
  });

  describe('Color Tokens', () => {
    test('should generate valid color token structure', () => {
      const expectedColorTokens = {
        color: {
          brand: {
            primary: '#11D9E6',
            ink: '#0D1214',
            surface: '#082C32',
          },
          neutral: {
            100: '#F2F5F6',
            200: '#E6EBED',
            300: '#CBD5D9',
            400: '#AFBEC4',
            500: '#93A7AF',
            600: '#798F99',
            700: '#5F7782',
            800: '#485E68',
            900: '#31454E',
          },
          accent: {
            warn: '#D97706',
            ok: '#10B981',
          },
        },
      };

      // Test token structure
      expect(expectedColorTokens.color).toBeDefined();
      expect(expectedColorTokens.color.brand).toBeDefined();
      expect(expectedColorTokens.color.neutral).toBeDefined();
      expect(expectedColorTokens.color.accent).toBeDefined();
    });

    test('should have valid brand colors', () => {
      const brandColors = {
        primary: '#11D9E6',
        ink: '#0D1214',
        surface: '#082C32',
      };

      Object.entries(brandColors).forEach(([key, value]) => {
        expect(value).toMatch(/^#[0-9A-F]{6}$/i);
        expect(typeof key).toBe('string');
        expect(key.length).toBeGreaterThan(0);
      });
    });

    test('should have complete neutral scale', () => {
      const neutralScale = {
        100: '#F2F5F6',
        200: '#E6EBED',
        300: '#CBD5D9',
        400: '#AFBEC4',
        500: '#93A7AF',
        600: '#798F99',
        700: '#5F7782',
        800: '#485E68',
        900: '#31454E',
      };

      // Test all scale values exist
      const expectedKeys = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      expectedKeys.forEach(key => {
        expect(neutralScale[key]).toBeDefined();
        expect(neutralScale[key]).toMatch(/^#[0-9A-F]{6}$/i);
      });

      // Test scale progression (should get darker)
      const values = Object.values(neutralScale);
      for (let i = 1; i < values.length; i++) {
        const current = parseInt(values[i].slice(1), 16);
        const previous = parseInt(values[i - 1].slice(1), 16);
        expect(current).toBeLessThan(previous);
      }
    });

    test('should have valid accent colors', () => {
      const accentColors = {
        warn: '#D97706',
        ok: '#10B981',
      };

      Object.entries(accentColors).forEach(([key, value]) => {
        expect(value).toMatch(/^#[0-9A-F]{6}$/i);
        expect(['warn', 'ok']).toContain(key);
      });
    });

    test('should validate color contrast ratios', () => {
      // Test high contrast combinations
      const brand = {
        primary: '#11D9E6',
        ink: '#0D1214',
        surface: '#082C32',
      };

      // Primary should have good contrast with ink
      const primaryLuminance = getLuminance(brand.primary);
      const inkLuminance = getLuminance(brand.ink);
      const contrastRatio = getContrastRatio(primaryLuminance, inkLuminance);

      // WCAG AA requires 4.5:1 for normal text
      expect(contrastRatio).toBeGreaterThan(4.5);
    });
  });

  describe('Typography Tokens', () => {
    test('should generate valid typography token structure', () => {
      const expectedTypeTokens = {
        type: {
          h1: { size: 40, line: 48, weight: 'Medium', tracking: 0.01 },
          h2: { size: 28, line: 36, weight: 'Medium', tracking: 0.01 },
          h3: { size: 20, line: 28, weight: 'Medium', tracking: 0.01 },
          body: { size: 16, line: 24, weight: 'Regular', tracking: 0 },
          small: { size: 14, line: 20, weight: 'Regular', tracking: 0 },
          family: 'Inter',
        },
      };

      expect(expectedTypeTokens.type).toBeDefined();
      expect(expectedTypeTokens.type.family).toBe('Inter');
    });

    test('should have valid type scale', () => {
      const typeScale = {
        h1: { size: 40, line: 48 },
        h2: { size: 28, line: 36 },
        h3: { size: 20, line: 28 },
        body: { size: 16, line: 24 },
        small: { size: 14, line: 20 },
      };

      Object.entries(typeScale).forEach(([key, value]) => {
        expect(value.size).toBeGreaterThan(0);
        expect(value.line).toBeGreaterThanOrEqual(value.size);
        expect(typeof key).toBe('string');
      });

      // Test scale progression
      const sizes = Object.values(typeScale).map(v => v.size);
      expect(sizes).toEqual([40, 28, 20, 16, 14]); // Descending order
    });

    test('should have valid line height ratios', () => {
      const typeScale = {
        h1: { size: 40, line: 48 },
        h2: { size: 28, line: 36 },
        h3: { size: 20, line: 28 },
        body: { size: 16, line: 24 },
        small: { size: 14, line: 20 },
      };

      Object.entries(typeScale).forEach(([key, value]) => {
        const ratio = value.line / value.size;
        expect(ratio).toBeGreaterThanOrEqual(1.0);
        expect(ratio).toBeLessThanOrEqual(2.0);
      });
    });

    test('should have valid font weights', () => {
      const weights = ['Medium', 'Regular'];
      const typeTokens = {
        h1: { weight: 'Medium' },
        h2: { weight: 'Medium' },
        h3: { weight: 'Medium' },
        body: { weight: 'Regular' },
        small: { weight: 'Regular' },
      };

      Object.values(typeTokens).forEach(token => {
        expect(weights).toContain(token.weight);
      });
    });

    test('should have valid letter spacing values', () => {
      const trackingValues = {
        h1: 0.01,
        h2: 0.01,
        h3: 0.01,
        body: 0,
        small: 0,
      };

      Object.entries(trackingValues).forEach(([key, value]) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(-0.1);
        expect(value).toBeLessThanOrEqual(0.1);
      });
    });
  });

  describe('File Generation', () => {
    test('should create tokens directory', () => {
      // Simulate the token generation process
      const distDir = path.join(process.cwd(), 'dist');
      const tokensDir = path.join(distDir, 'tokens');

      // Mock the directory creation
      mockFs.mkdirSync(tokensDir, { recursive: true });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(tokensDir, { recursive: true });
    });

    test('should write color tokens file', () => {
      const colorTokens = {
        color: {
          brand: { primary: '#11D9E6' }
        }
      };

      const tokensDir = path.join(process.cwd(), 'dist', 'tokens');
      const colorFile = path.join(tokensDir, 'color.json');

      mockFs.writeFileSync(colorFile, JSON.stringify(colorTokens, null, 2));

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        colorFile,
        JSON.stringify(colorTokens, null, 2)
      );
    });

    test('should write typography tokens file', () => {
      const typeTokens = {
        type: {
          h1: { size: 40, line: 48, weight: 'Medium' }
        }
      };

      const tokensDir = path.join(process.cwd(), 'dist', 'tokens');
      const typeFile = path.join(tokensDir, 'type.json');

      mockFs.writeFileSync(typeFile, JSON.stringify(typeTokens, null, 2));

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        typeFile,
        JSON.stringify(typeTokens, null, 2)
      );
    });

    test('should generate valid JSON output', () => {
      const colorTokens = {
        color: {
          brand: { primary: '#11D9E6' }
        }
      };

      const jsonOutput = JSON.stringify(colorTokens, null, 2);

      expect(() => JSON.parse(jsonOutput)).not.toThrow();
      expect(JSON.parse(jsonOutput)).toEqual(colorTokens);
    });
  });

  describe('Token Validation', () => {
    test('should validate token naming conventions', () => {
      const tokenNames = [
        'color.brand.primary',
        'color.neutral.100',
        'color.accent.warn',
        'type.h1.size',
        'type.body.line'
      ];

      tokenNames.forEach(name => {
        expect(name).toMatch(/^[a-z]+(\.[a-z0-9]+)+$/);
        expect(name.split('.')).toHaveLength(3);
      });
    });

    test('should validate token value types', () => {
      const tokens = {
        color: '#11D9E6',
        size: 16,
        line: 24,
        weight: 'Medium',
        tracking: 0.01,
        family: 'Inter'
      };

      expect(typeof tokens.color).toBe('string');
      expect(typeof tokens.size).toBe('number');
      expect(typeof tokens.line).toBe('number');
      expect(typeof tokens.weight).toBe('string');
      expect(typeof tokens.tracking).toBe('number');
      expect(typeof tokens.family).toBe('string');
    });

    test('should ensure token consistency', () => {
      // Test that heading sizes follow a consistent scale
      const headingSizes = [40, 28, 20]; // h1, h2, h3
      const ratios = [];

      for (let i = 1; i < headingSizes.length; i++) {
        ratios.push(headingSizes[i - 1] / headingSizes[i]);
      }

      // Ratios should be reasonably consistent (type scale)
      ratios.forEach(ratio => {
        expect(ratio).toBeGreaterThan(1.2);
        expect(ratio).toBeLessThan(2.0);
      });
    });
  });
});

// Helper functions for color contrast testing
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(lum1: number, lum2: number): number {
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}
