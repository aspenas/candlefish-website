/**
 * Test utilities and helper functions
 */
import { mockFigma } from './setup';

// Color utility functions for testing
export const colorUtils = {
  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized, 16);
    return {
      r: ((bigint >> 16) & 255) / 255,
      g: ((bigint >> 8) & 255) / 255,
      b: (bigint & 255) / 255
    };
  },

  rgbToHex(r: number, g: number, b: number): string {
    const toHex = (val: number) => {
      const hex = Math.round(val * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  },

  getLuminance(hex: string): number {
    const { r, g, b } = this.hexToRgb(hex);
    const [rs, gs, bs] = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },

  isValidHex(hex: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }
};

// Component testing utilities
export const componentUtils = {
  createTestComponent(name: string, width: number = 100, height: number = 100) {
    const component = mockFigma.createComponent();
    component.name = name;
    component.resize(width, height);
    return component;
  },

  createTestFrame(name: string, layoutMode: string = 'NONE') {
    const frame = mockFigma.createFrame();
    frame.name = name;
    frame.layoutMode = layoutMode;
    return frame;
  },

  createTestText(characters: string, fontSize: number = 16) {
    const text = mockFigma.createText();
    text.characters = characters;
    text.fontSize = fontSize;
    text.fontName = { family: 'Inter', style: 'Regular' };
    return text;
  },

  verifyExportSettings(node: any, expectedFormats: string[]) {
    expect(node.exportSettings).toBeDefined();
    expect(node.exportSettings).toHaveLength(expectedFormats.length);

    expectedFormats.forEach((format, index) => {
      expect(node.exportSettings[index].format).toBe(format);
    });
  },

  verifyComponentStructure(component: any, expectedChildCount: number) {
    expect(component.type).toBe('COMPONENT');
    expect(component.children).toHaveLength(expectedChildCount);
    expect(component.name).toBeDefined();
    expect(component.width).toBeGreaterThan(0);
    expect(component.height).toBeGreaterThan(0);
  }
};

// Typography testing utilities
export const typographyUtils = {
  validateTypeScale(scale: Array<{ name: string; size: number; line: number }>) {
    // Ensure sizes are in descending order
    for (let i = 1; i < scale.length; i++) {
      expect(scale[i].size).toBeLessThanOrEqual(scale[i - 1].size);
    }

    // Ensure line heights are appropriate
    scale.forEach(({ size, line }) => {
      const ratio = line / size;
      expect(ratio).toBeGreaterThanOrEqual(1.0);
      expect(ratio).toBeLessThanOrEqual(2.0);
    });
  },

  createTestTextStyle(name: string, fontSize: number, fontWeight: string = 'Regular') {
    const style = mockFigma.createTextStyle();
    style.name = name;
    style.fontSize = fontSize;
    style.fontName = { family: 'Inter', style: fontWeight };
    return style;
  },

  validateFontWeight(weight: string) {
    const validWeights = [
      'Thin', 'ExtraLight', 'Light', 'Regular', 'Medium',
      'SemiBold', 'Bold', 'ExtraBold', 'Black'
    ];
    expect(validWeights).toContain(weight);
  }
};

// Mock data generators
export const mockDataGenerators = {
  generateMockImageBytes(size: number = 1024): Uint8Array {
    return new Uint8Array(Array.from({ length: size }, (_, i) => i % 256));
  },

  generateMockApiResponse(nodeIds: string[]) {
    const images: Record<string, string> = {};
    nodeIds.forEach(id => {
      images[id] = `https://figma-images.com/${id}.svg`;
    });
    return { images };
  },

  generateMockDocument(pageNames: string[] = ['Page 1']) {
    return {
      document: {
        id: 'root',
        name: 'Document',
        children: pageNames.map((name, index) => ({
          id: `page-${index}`,
          name,
          type: 'CANVAS',
          children: []
        }))
      }
    };
  },

  generateColorPalette(baseHue: number = 200, steps: number = 9) {
    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      const lightness = 95 - (i * 10); // 95% to 5%
      const saturation = 20 + (i * 5); // 20% to 60%
      colors.push(`hsl(${baseHue}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
  }
};

// Test assertion helpers
export const testAssertions = {
  expectValidComponent(component: any) {
    expect(component).toBeDefined();
    expect(component.name).toBeDefined();
    expect(typeof component.name).toBe('string');
    expect(component.name.length).toBeGreaterThan(0);
    expect(component.width).toBeGreaterThan(0);
    expect(component.height).toBeGreaterThan(0);
  },

  expectValidColorStyle(style: any, expectedName: string) {
    expect(style).toBeDefined();
    expect(style.name).toBe(expectedName);
    expect(style.paints).toBeDefined();
    expect(style.paints).toHaveLength(1);
    expect(style.paints[0].type).toBe('SOLID');
    expect(style.paints[0].color).toBeDefined();
  },

  expectValidTextStyle(style: any, expectedName: string) {
    expect(style).toBeDefined();
    expect(style.name).toBe(expectedName);
    expect(style.fontSize).toBeGreaterThan(0);
    expect(style.fontName).toBeDefined();
    expect(style.fontName.family).toBeDefined();
    expect(style.fontName.style).toBeDefined();
  },

  expectValidLayoutProperties(node: any) {
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      expect(['HORIZONTAL', 'VERTICAL']).toContain(node.layoutMode);
      expect(typeof node.itemSpacing).toBe('number');
      expect(node.itemSpacing).toBeGreaterThanOrEqual(0);
    }
  },

  expectValidExportSettings(node: any) {
    expect(node.exportSettings).toBeDefined();
    expect(Array.isArray(node.exportSettings)).toBe(true);

    node.exportSettings.forEach((setting: any) => {
      expect(setting.format).toBeDefined();
      expect(['SVG', 'PDF', 'PNG', 'JPG']).toContain(setting.format);
    });
  }
};

// Performance testing utilities
export const performanceUtils = {
  measureExecutionTime<T>(fn: () => T): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    return { result, duration: end - start };
  },

  async measureAsyncExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, duration: end - start };
  },

  expectPerformantExecution(duration: number, maxDuration: number = 1000) {
    expect(duration).toBeLessThan(maxDuration);
  }
};

// Brand validation utilities
export const brandUtils = {
  validateBrandColors() {
    const brandColors = {
      primary: '#11D9E6',
      ink: '#0D1214',
      surface: '#082C32'
    };

    Object.entries(brandColors).forEach(([name, hex]) => {
      expect(colorUtils.isValidHex(hex)).toBe(true);
    });

    // Test contrast ratios
    const primaryInkContrast = colorUtils.getContrastRatio(
      brandColors.primary,
      brandColors.ink
    );
    expect(primaryInkContrast).toBeGreaterThan(4.5); // WCAG AA compliance
  },

  validateNeutralScale() {
    const neutralScale = [
      '#F2F5F6', '#E6EBED', '#CBD5D9', '#AFBEC4', '#93A7AF',
      '#798F99', '#5F7782', '#485E68', '#31454E'
    ];

    // Validate all are valid hex colors
    neutralScale.forEach(hex => {
      expect(colorUtils.isValidHex(hex)).toBe(true);
    });

    // Validate scale progression (should get darker)
    for (let i = 1; i < neutralScale.length; i++) {
      const current = parseInt(neutralScale[i].slice(1), 16);
      const previous = parseInt(neutralScale[i - 1].slice(1), 16);
      expect(current).toBeLessThan(previous);
    }
  },

  validateTypeScale() {
    const typeScale = [
      { name: 'H1', size: 40, line: 48 },
      { name: 'H2', size: 28, line: 36 },
      { name: 'H3', size: 20, line: 28 },
      { name: 'Body', size: 16, line: 24 },
      { name: 'Small', size: 14, line: 20 }
    ];

    typographyUtils.validateTypeScale(typeScale);
  }
};

describe('Test Utilities', () => {
  describe('Color Utils', () => {
    test('should convert hex to RGB correctly', () => {
      const result = colorUtils.hexToRgb('#11D9E6');
      expect(result.r).toBeCloseTo(0.067, 3);
      expect(result.g).toBeCloseTo(0.851, 3);
      expect(result.b).toBeCloseTo(0.902, 3);
    });

    test('should convert RGB to hex correctly', () => {
      const result = colorUtils.rgbToHex(0.067, 0.851, 0.902);
      expect(result).toBe('#11D9E6');
    });

    test('should calculate contrast ratio correctly', () => {
      const ratio = colorUtils.getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 0); // Maximum contrast ratio
    });

    test('should validate hex colors', () => {
      expect(colorUtils.isValidHex('#11D9E6')).toBe(true);
      expect(colorUtils.isValidHex('#invalid')).toBe(false);
      expect(colorUtils.isValidHex('11D9E6')).toBe(false);
    });
  });

  describe('Component Utils', () => {
    test('should create test components correctly', () => {
      const component = componentUtils.createTestComponent('Test Component', 200, 100);

      testAssertions.expectValidComponent(component);
      expect(component.name).toBe('Test Component');
      expect(component.width).toBe(200);
      expect(component.height).toBe(100);
    });

    test('should verify component structure', () => {
      const component = componentUtils.createTestComponent('Test');
      const child = mockFigma.createRectangle();
      component.appendChild(child);

      componentUtils.verifyComponentStructure(component, 1);
    });
  });

  describe('Mock Data Generators', () => {
    test('should generate mock image bytes', () => {
      const bytes = mockDataGenerators.generateMockImageBytes(100);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(100);
    });

    test('should generate mock API response', () => {
      const nodeIds = ['node1', 'node2', 'node3'];
      const response = mockDataGenerators.generateMockApiResponse(nodeIds);

      expect(response.images).toBeDefined();
      expect(Object.keys(response.images)).toHaveLength(3);
      nodeIds.forEach(id => {
        expect(response.images[id]).toContain(id);
      });
    });
  });

  describe('Performance Utils', () => {
    test('should measure execution time', () => {
      const { result, duration } = performanceUtils.measureExecutionTime(() => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500); // Sum of 0 to 999
      expect(duration).toBeGreaterThan(0);
      performanceUtils.expectPerformantExecution(duration, 100);
    });
  });

  describe('Brand Utils', () => {
    test('should validate brand colors', () => {
      expect(() => brandUtils.validateBrandColors()).not.toThrow();
    });

    test('should validate neutral scale', () => {
      expect(() => brandUtils.validateNeutralScale()).not.toThrow();
    });

    test('should validate type scale', () => {
      expect(() => brandUtils.validateTypeScale()).not.toThrow();
    });
  });
});
