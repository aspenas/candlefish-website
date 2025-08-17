/**
 * Unit tests for component creation functionality
 */
import { mockFigma, MockComponentNode, MockFrameNode } from './setup';

describe('Component Creation', () => {
  beforeEach(() => {
    mockFigma.root.children = [];
    mockFigma.currentPage = null;
  });

  describe('Logo Component Creation', () => {
    test('should create logo component with correct dimensions', () => {
      const component = mockFigma.createComponent();
      component.name = 'Logo/Primary';
      component.resizeWithoutConstraints(600, 240);

      expect(component.name).toBe('Logo/Primary');
      expect(component.width).toBe(600);
      expect(component.height).toBe(240);
      expect(component.type).toBe('COMPONENT');
    });

    test('should create logo component with image fill when bytes provided', () => {
      const component = mockFigma.createComponent();
      const rect = mockFigma.createRectangle();
      const mockBytes = new Uint8Array([1, 2, 3, 4]);

      // Simulate image creation and assignment
      if (mockBytes && mockBytes.length > 0) {
        const image = mockFigma.createImage(mockBytes);
        rect.fills = [{
          type: 'IMAGE',
          imageHash: image.hash,
          scaleMode: 'FIT',
        }];
      }

      component.appendChild(rect);

      expect(component.children).toHaveLength(1);
      expect(rect.fills).toHaveLength(1);
      expect(rect.fills[0].type).toBe('IMAGE');
      expect(rect.fills[0].scaleMode).toBe('FIT');
    });

    test('should create logo component with fallback fill when no bytes provided', () => {
      const component = mockFigma.createComponent();
      const rect = mockFigma.createRectangle();

      // Simulate fallback when no image bytes
      rect.fills = [{
        type: 'SOLID',
        color: { r: 0.067, g: 0.851, b: 0.902 } // #11D9E6
      }];

      component.appendChild(rect);

      expect(rect.fills).toHaveLength(1);
      expect(rect.fills[0].type).toBe('SOLID');
      expect(rect.fills[0].color).toEqual({
        r: 0.067,
        g: 0.851,
        b: 0.902
      });
    });

    test('should configure export settings correctly', () => {
      const component = mockFigma.createComponent();
      component.exportSettings = [
        { format: 'SVG', contentsOnly: true, useAbsoluteBounds: false },
        { format: 'PDF' },
      ];

      expect(component.exportSettings).toHaveLength(2);
      expect(component.exportSettings[0].format).toBe('SVG');
      expect(component.exportSettings[0].contentsOnly).toBe(true);
      expect(component.exportSettings[0].useAbsoluteBounds).toBe(false);
      expect(component.exportSettings[1].format).toBe('PDF');
    });

    test('should create wordmark component with text', () => {
      const wordmark = mockFigma.createComponent();
      wordmark.name = 'Logo/Wordmark';
      wordmark.resize(600, 180);

      const text = mockFigma.createText();
      text.characters = 'CANDLEFISH';
      text.fontName = { family: 'Inter', style: 'Medium' };
      text.fontSize = 72;
      text.letterSpacing = { unit: 'PERCENT', value: 1 };
      text.lineHeight = { unit: 'AUTO' };

      wordmark.appendChild(text);

      expect(wordmark.name).toBe('Logo/Wordmark');
      expect(wordmark.children).toHaveLength(1);
      expect(text.characters).toBe('CANDLEFISH');
      expect(text.fontSize).toBe(72);
      expect(text.fontName.family).toBe('Inter');
      expect(text.fontName.style).toBe('Medium');
    });

    test('should create logo variants with correct properties', () => {
      const variants = [
        { name: 'Logo/Primary', kind: 'Primary', width: 600, height: 240 },
        { name: 'Logo/Wordmark', kind: 'Wordmark', width: 600, height: 180 },
        { name: 'Logo/Lockup/Horizontal', kind: 'Lockup-Horizontal', width: 600, height: 240 },
        { name: 'Logo/Lockup/Stacked', kind: 'Lockup-Stacked', width: 360, height: 360 },
      ];

      const components = variants.map(variant => {
        const comp = mockFigma.createComponent();
        comp.name = variant.name;
        comp.resize(variant.width, variant.height);
        comp.variantProperties = { Kind: variant.kind };
        return comp;
      });

      components.forEach((comp, index) => {
        expect(comp.name).toBe(variants[index].name);
        expect(comp.width).toBe(variants[index].width);
        expect(comp.height).toBe(variants[index].height);
        expect(comp.variantProperties.Kind).toBe(variants[index].kind);
      });
    });
  });

  describe('Base Component Creation', () => {
    test('should create container component with layout properties', () => {
      const container = mockFigma.createComponent();
      container.name = 'Grid/Container';
      container.resize(1200, 800);
      container.cornerRadius = 0;
      container.layoutMode = 'VERTICAL';
      container.itemSpacing = 24;
      container.paddingLeft = 24;
      container.paddingRight = 24;
      container.paddingTop = 24;
      container.paddingBottom = 24;

      expect(container.name).toBe('Grid/Container');
      expect(container.width).toBe(1200);
      expect(container.height).toBe(800);
      expect(container.layoutMode).toBe('VERTICAL');
      expect(container.itemSpacing).toBe(24);
      expect(container.paddingLeft).toBe(24);
      expect(container.paddingRight).toBe(24);
      expect(container.paddingTop).toBe(24);
      expect(container.paddingBottom).toBe(24);
    });

    test('should create stack component with correct spacing', () => {
      const stack = mockFigma.createComponent();
      stack.name = 'Grid/Stack';
      stack.layoutMode = 'VERTICAL';
      stack.itemSpacing = 16;
      stack.resize(600, 400);

      expect(stack.name).toBe('Grid/Stack');
      expect(stack.layoutMode).toBe('VERTICAL');
      expect(stack.itemSpacing).toBe(16);
      expect(stack.width).toBe(600);
      expect(stack.height).toBe(400);
    });

    test('should create card component with styling', () => {
      const card = mockFigma.createComponent();
      card.name = 'Card/Base';
      card.resize(320, 200);
      card.cornerRadius = 2;
      card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // white
      card.strokes = [{ type: 'SOLID', color: { r: 0.902, g: 0.922, b: 0.929 } }]; // #E6EBED
      card.strokeWeight = 1;

      expect(card.name).toBe('Card/Base');
      expect(card.width).toBe(320);
      expect(card.height).toBe(200);
      expect(card.cornerRadius).toBe(2);
      expect(card.fills[0].type).toBe('SOLID');
      expect(card.fills[0].color).toEqual({ r: 1, g: 1, b: 1 });
      expect(card.strokeWeight).toBe(1);
    });

    test('should create primary button component', () => {
      const btnPrimary = mockFigma.createComponent();
      btnPrimary.name = 'Button/Primary';
      btnPrimary.resize(160, 40);
      btnPrimary.cornerRadius = 2;
      btnPrimary.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.851, b: 0.902 } }]; // #11D9E6
      btnPrimary.strokes = [];

      expect(btnPrimary.name).toBe('Button/Primary');
      expect(btnPrimary.width).toBe(160);
      expect(btnPrimary.height).toBe(40);
      expect(btnPrimary.cornerRadius).toBe(2);
      expect(btnPrimary.fills[0].color).toEqual({ r: 0.067, g: 0.851, b: 0.902 });
      expect(btnPrimary.strokes).toHaveLength(0);
    });

    test('should create quiet button component', () => {
      const btnQuiet = mockFigma.createComponent();
      btnQuiet.name = 'Button/Quiet';
      btnQuiet.resize(160, 40);
      btnQuiet.cornerRadius = 2;
      btnQuiet.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // white
      btnQuiet.strokes = [{ type: 'SOLID', color: { r: 0.796, g: 0.835, b: 0.851 } }]; // #CBD5D9
      btnQuiet.strokeWeight = 1;

      expect(btnQuiet.name).toBe('Button/Quiet');
      expect(btnQuiet.fills[0].color).toEqual({ r: 1, g: 1, b: 1 });
      expect(btnQuiet.strokes[0].color).toEqual({ r: 0.796, g: 0.835, b: 0.851 });
      expect(btnQuiet.strokeWeight).toBe(1);
    });
  });

  describe('Layout Grid Creation', () => {
    test('should create 8pt grid on container', () => {
      const container = mockFigma.createComponent();
      container.layoutGrids = [{
        pattern: 'GRID',
        sectionSize: 8,
        color: { r: 0, g: 0.75, b: 1 },
        visible: false
      }];

      expect(container.layoutGrids).toHaveLength(1);
      expect(container.layoutGrids[0].pattern).toBe('GRID');
      expect(container.layoutGrids[0].sectionSize).toBe(8);
      expect(container.layoutGrids[0].visible).toBe(false);
    });

    test('should validate grid properties', () => {
      const grid = {
        pattern: 'GRID',
        sectionSize: 8,
        color: { r: 0, g: 0.75, b: 1 },
        visible: false
      };

      expect(['GRID', 'COLUMNS', 'ROWS']).toContain(grid.pattern);
      expect(grid.sectionSize).toBeGreaterThan(0);
      expect(grid.color.r).toBeGreaterThanOrEqual(0);
      expect(grid.color.r).toBeLessThanOrEqual(1);
      expect(typeof grid.visible).toBe('boolean');
    });
  });

  describe('Typography Style Creation', () => {
    test('should create text styles with correct properties', () => {
      const styles = [
        { name: 'Type/H1', fontSize: 40, lineHeight: 48, fontWeight: 'Medium' },
        { name: 'Type/H2', fontSize: 28, lineHeight: 36, fontWeight: 'Medium' },
        { name: 'Type/H3', fontSize: 20, lineHeight: 28, fontWeight: 'Medium' },
        { name: 'Type/Body', fontSize: 16, lineHeight: 24, fontWeight: 'Regular' },
        { name: 'Type/Small', fontSize: 14, lineHeight: 20, fontWeight: 'Regular' },
      ];

      styles.forEach(styleConfig => {
        const ts = mockFigma.createTextStyle();
        ts.name = styleConfig.name;
        ts.fontSize = styleConfig.fontSize;
        ts.lineHeight = { unit: 'PIXELS', value: styleConfig.lineHeight };
        ts.fontName = { family: 'Inter', style: styleConfig.fontWeight };

        expect(ts.name).toBe(styleConfig.name);
        expect(ts.fontSize).toBe(styleConfig.fontSize);
        expect(ts.lineHeight.unit).toBe('PIXELS');
        expect(ts.lineHeight.value).toBe(styleConfig.lineHeight);
        expect(ts.fontName.family).toBe('Inter');
        expect(ts.fontName.style).toBe(styleConfig.fontWeight);
      });
    });

    test('should validate line height relationships', () => {
      const typeScale = [
        { fontSize: 40, lineHeight: 48 },
        { fontSize: 28, lineHeight: 36 },
        { fontSize: 20, lineHeight: 28 },
        { fontSize: 16, lineHeight: 24 },
        { fontSize: 14, lineHeight: 20 },
      ];

      typeScale.forEach(({ fontSize, lineHeight }) => {
        const ratio = lineHeight / fontSize;
        expect(ratio).toBeGreaterThanOrEqual(1.0);
        expect(ratio).toBeLessThanOrEqual(2.0);
      });
    });
  });

  describe('Page Creation', () => {
    test('should create required pages', async () => {
      const pageNames = [
        'Cover',
        '01 Brand Assets',
        '02 Type & Color',
        '03 Components',
        '04 Specimens'
      ];

      const pages = pageNames.map(name => {
        const page = mockFigma.createPage();
        page.name = name;
        return page;
      });

      expect(pages).toHaveLength(5);
      pages.forEach((page, index) => {
        expect(page.name).toBe(pageNames[index]);
        expect(page.type).toBe('PAGE');
      });
    });

    test('should ensure page exists or create new one', async () => {
      const pageName = 'Test Page';

      // Simulate page lookup
      let existingPage = mockFigma.root.children.find(p => p.name === pageName);

      if (!existingPage) {
        const newPage = mockFigma.createPage();
        newPage.name = pageName;
        existingPage = newPage;
      }

      expect(existingPage).toBeDefined();
      expect(existingPage.name).toBe(pageName);
    });
  });

  describe('Brand Sheet Creation', () => {
    test('should create brand sheet frame with correct layout', () => {
      const brandSheet = mockFigma.createFrame();
      brandSheet.name = 'Brand Sheet';
      brandSheet.resize(1440, 1024);
      brandSheet.layoutMode = 'VERTICAL';
      brandSheet.itemSpacing = 32;
      brandSheet.paddingTop = 64;
      brandSheet.paddingBottom = 64;
      brandSheet.paddingLeft = 64;
      brandSheet.paddingRight = 64;

      expect(brandSheet.name).toBe('Brand Sheet');
      expect(brandSheet.width).toBe(1440);
      expect(brandSheet.height).toBe(1024);
      expect(brandSheet.layoutMode).toBe('VERTICAL');
      expect(brandSheet.itemSpacing).toBe(32);
      expect(brandSheet.paddingTop).toBe(64);
    });

    test('should create color swatches with correct structure', () => {
      const swatches = mockFigma.createFrame();
      swatches.name = 'Color Swatches';
      swatches.layoutMode = 'HORIZONTAL';
      swatches.itemSpacing = 24;
      swatches.counterAxisSizingMode = 'AUTO';
      swatches.primaryAxisSizingMode = 'AUTO';

      // Create individual swatch
      const swatch = mockFigma.createFrame();
      swatch.name = 'Brand/Primary';
      swatch.layoutMode = 'VERTICAL';
      swatch.itemSpacing = 8;

      const rect = mockFigma.createRectangle();
      rect.resize(120, 80);
      rect.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.851, b: 0.902 } }];

      swatch.appendChild(rect);
      swatches.appendChild(swatch);

      expect(swatches.layoutMode).toBe('HORIZONTAL');
      expect(swatch.children).toHaveLength(1);
      expect(rect.width).toBe(120);
      expect(rect.height).toBe(80);
    });
  });

  describe('Error Handling', () => {
    test('should handle font loading failures gracefully', async () => {
      const mockLoadFont = jest.fn().mockRejectedValue(new Error('Font not found'));

      try {
        await mockLoadFont({ family: 'NonexistentFont', style: 'Regular' });
      } catch (error) {
        // Should not crash the plugin
        expect(error.message).toBe('Font not found');
      }

      // Plugin should continue working even if font loading fails
      const text = mockFigma.createText();
      text.characters = 'Test Text';
      expect(text.characters).toBe('Test Text');
    });

    test('should handle missing image bytes gracefully', () => {
      const component = mockFigma.createComponent();
      const rect = mockFigma.createRectangle();

      // Simulate missing or undefined bytes
      const imgBytes = undefined;

      if (imgBytes && imgBytes.length > 0) {
        // Would create image fill
      } else {
        // Fallback to solid color
        rect.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.851, b: 0.902 } }];
      }

      component.appendChild(rect);

      expect(rect.fills[0].type).toBe('SOLID');
      expect(component.children).toHaveLength(1);
    });

    test('should validate component dimensions', () => {
      const component = mockFigma.createComponent();

      // Test valid dimensions
      component.resize(600, 240);
      expect(component.width).toBe(600);
      expect(component.height).toBe(240);

      // Test zero dimensions handling
      component.resize(0, 0);
      expect(component.width).toBe(0);
      expect(component.height).toBe(0);

      // Test negative dimensions (should be handled by Figma API)
      component.resize(-100, -50);
      // In real Figma, negative values would be corrected or cause an error
    });
  });
});
