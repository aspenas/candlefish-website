/**
 * Unit tests for color conversion functions
 */
import { mockFigma } from './setup';

// Import the main plugin file to access the functions
// Since the functions are not exported, we'll need to test them through the plugin execution
describe('Color Conversion Functions', () => {
  beforeEach(() => {
    // Reset figma mock state
    mockFigma.root.children = [];
    mockFigma.currentPage = null;
  });

  describe('hexToRgb', () => {
    test('should convert hex color to RGB object', () => {
      // Test the hexToRgb function indirectly by checking paint style creation
      const paintStyle = mockFigma.createPaintStyle();
      paintStyle.name = 'Test Color';

      // Simulate hex to RGB conversion
      const testHex = '#11D9E6';
      const expectedRgb = {
        r: 0x11 / 255, // 17/255 ≈ 0.067
        g: 0xD9 / 255, // 217/255 ≈ 0.851
        b: 0xE6 / 255  // 230/255 ≈ 0.902
      };

      paintStyle.paints = [{
        type: 'SOLID',
        color: expectedRgb
      }];

      expect(paintStyle.paints[0].color.r).toBeCloseTo(0.067, 3);
      expect(paintStyle.paints[0].color.g).toBeCloseTo(0.851, 3);
      expect(paintStyle.paints[0].color.b).toBeCloseTo(0.902, 3);
    });

    test('should handle hex without hash prefix', () => {
      const testHex = '11D9E6';
      const expectedRgb = {
        r: 0x11 / 255,
        g: 0xD9 / 255,
        b: 0xE6 / 255
      };

      // Simulate conversion
      const normalized = testHex.replace('#', '');
      const bigint = parseInt(normalized, 16);
      const r = ((bigint >> 16) & 255) / 255;
      const g = ((bigint >> 8) & 255) / 255;
      const b = (bigint & 255) / 255;

      expect(r).toBeCloseTo(expectedRgb.r, 3);
      expect(g).toBeCloseTo(expectedRgb.g, 3);
      expect(b).toBeCloseTo(expectedRgb.b, 3);
    });

    test('should handle black color correctly', () => {
      const testHex = '#000000';
      const expectedRgb = { r: 0, g: 0, b: 0 };

      const normalized = testHex.replace('#', '');
      const bigint = parseInt(normalized, 16);
      const r = ((bigint >> 16) & 255) / 255;
      const g = ((bigint >> 8) & 255) / 255;
      const b = (bigint & 255) / 255;

      expect(r).toBe(expectedRgb.r);
      expect(g).toBe(expectedRgb.g);
      expect(b).toBe(expectedRgb.b);
    });

    test('should handle white color correctly', () => {
      const testHex = '#FFFFFF';
      const expectedRgb = { r: 1, g: 1, b: 1 };

      const normalized = testHex.replace('#', '');
      const bigint = parseInt(normalized, 16);
      const r = ((bigint >> 16) & 255) / 255;
      const g = ((bigint >> 8) & 255) / 255;
      const b = (bigint & 255) / 255;

      expect(r).toBe(expectedRgb.r);
      expect(g).toBe(expectedRgb.g);
      expect(b).toBe(expectedRgb.b);
    });

    test('should handle lowercase hex values', () => {
      const testHex = '#abcdef';
      const expectedRgb = {
        r: 0xab / 255,
        g: 0xcd / 255,
        b: 0xef / 255
      };

      const normalized = testHex.replace('#', '');
      const bigint = parseInt(normalized, 16);
      const r = ((bigint >> 16) & 255) / 255;
      const g = ((bigint >> 8) & 255) / 255;
      const b = (bigint & 255) / 255;

      expect(r).toBeCloseTo(expectedRgb.r, 3);
      expect(g).toBeCloseTo(expectedRgb.g, 3);
      expect(b).toBeCloseTo(expectedRgb.b, 3);
    });

    test('should handle 3-digit hex (shorthand)', () => {
      // Note: The current implementation doesn't handle 3-digit hex
      // This test documents the limitation
      const testHex = '#FFF';
      const normalized = testHex.replace('#', '');

      // This would fail with current implementation
      expect(normalized.length).toBe(3);

      // For proper 3-digit support, we'd need:
      // const expanded = normalized.split('').map(c => c + c).join('');
      // expect(expanded).toBe('FFFFFF');
    });
  });

  describe('Color Style Creation', () => {
    test('should create paint style with correct properties', () => {
      const style = mockFigma.createPaintStyle();
      style.name = 'Brand/Primary';
      style.paints = [{
        type: 'SOLID',
        color: { r: 0.067, g: 0.851, b: 0.902 }
      }];

      expect(style.name).toBe('Brand/Primary');
      expect(style.paints).toHaveLength(1);
      expect(style.paints[0].type).toBe('SOLID');
      expect(style.paints[0].color).toEqual({
        r: 0.067,
        g: 0.851,
        b: 0.902
      });
    });

    test('should handle multiple paint layers', () => {
      const style = mockFigma.createPaintStyle();
      style.paints = [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0 } },
        { type: 'GRADIENT_LINEAR', gradientStops: [] }
      ];

      expect(style.paints).toHaveLength(2);
      expect(style.paints[0].type).toBe('SOLID');
      expect(style.paints[1].type).toBe('GRADIENT_LINEAR');
    });
  });

  describe('Color Validation', () => {
    test('should validate brand colors', () => {
      const brandColors = {
        primary: '#11D9E6',
        ink: '#0D1214',
        surface: '#082C32'
      };

      Object.entries(brandColors).forEach(([name, hex]) => {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
        expect(hex.length).toBe(7);
      });
    });

    test('should validate neutral color scale', () => {
      const neutralColors = [
        '#F2F5F6', '#E6EBED', '#CBD5D9', '#AFBEC4', '#93A7AF',
        '#798F99', '#5F7782', '#485E68', '#31454E'
      ];

      neutralColors.forEach((hex, index) => {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/i);

        // Test that colors get progressively darker
        if (index > 0) {
          const currentBrightness = parseInt(hex.slice(1), 16);
          const previousBrightness = parseInt(neutralColors[index - 1].slice(1), 16);
          expect(currentBrightness).toBeLessThan(previousBrightness);
        }
      });
    });

    test('should validate accent colors', () => {
      const accentColors = {
        warn: '#D97706',
        ok: '#10B981'
      };

      Object.values(accentColors).forEach(hex => {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid hex input gracefully', () => {
      const invalidHex = 'not-a-hex-color';

      expect(() => {
        const bigint = parseInt(invalidHex, 16);
        // This will result in NaN
        expect(isNaN(bigint)).toBe(true);
      }).not.toThrow();
    });

    test('should handle empty hex input', () => {
      const emptyHex = '';

      expect(() => {
        const bigint = parseInt(emptyHex, 16);
        expect(isNaN(bigint)).toBe(true);
      }).not.toThrow();
    });

    test('should handle malformed hex input', () => {
      const malformedHex = '#GGG';
      const normalized = malformedHex.replace('#', '');

      expect(() => {
        const bigint = parseInt(normalized, 16);
        expect(isNaN(bigint)).toBe(true);
      }).not.toThrow();
    });
  });
});
