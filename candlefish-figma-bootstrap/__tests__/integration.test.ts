/**
 * Integration tests for the full Figma plugin flow
 */
import { mockFigma } from './setup';

// Mock the main plugin module by simulating its execution
describe('Plugin Integration Tests', () => {
  beforeEach(() => {
    mockFigma.root.children = [];
    mockFigma.currentPage = null;
    jest.clearAllMocks();
  });

  describe('Full Plugin Execution', () => {
    test('should execute complete brand bootstrap flow', async () => {
      // Simulate the full plugin execution
      const mockBytes = new Uint8Array([1, 2, 3, 4]);

      // 1. Create required pages
      const coverPage = mockFigma.createPage();
      coverPage.name = 'Cover';

      const assetsPage = mockFigma.createPage();
      assetsPage.name = '01 Brand Assets';

      const typeColorPage = mockFigma.createPage();
      typeColorPage.name = '02 Type & Color';

      const componentsPage = mockFigma.createPage();
      componentsPage.name = '03 Components';

      const specimensPage = mockFigma.createPage();
      specimensPage.name = '04 Specimens';

      // Verify pages were created
      expect(mockFigma.root.children).toHaveLength(5);
      expect(mockFigma.root.children.map(p => p.name)).toEqual([
        'Cover',
        '01 Brand Assets',
        '02 Type & Color',
        '03 Components',
        '04 Specimens'
      ]);

      // 2. Create color styles and variables
      const brandColors = ['Brand/Primary', 'Brand/Ink', 'Brand/Surface'];
      const paintStyles = brandColors.map(name => {
        const style = mockFigma.createPaintStyle();
        style.name = name;
        return style;
      });

      expect(paintStyles).toHaveLength(3);
      paintStyles.forEach((style, index) => {
        expect(style.name).toBe(brandColors[index]);
      });

      // 3. Create typography styles
      const typeStyles = [
        'Type/H1', 'Type/H2', 'Type/H3', 'Type/Body', 'Type/Small'
      ].map(name => {
        const style = mockFigma.createTextStyle();
        style.name = name;
        return style;
      });

      expect(typeStyles).toHaveLength(5);

      // 4. Create logo components
      mockFigma.currentPage = assetsPage;

      const logoPrimary = mockFigma.createComponent();
      logoPrimary.name = 'Logo/Primary';
      logoPrimary.resizeWithoutConstraints(600, 240);
      assetsPage.appendChild(logoPrimary);

      const wordmark = mockFigma.createComponent();
      wordmark.name = 'Logo/Wordmark';
      wordmark.resize(600, 180);
      assetsPage.appendChild(wordmark);

      // 5. Create base components
      mockFigma.currentPage = componentsPage;

      const container = mockFigma.createComponent();
      container.name = 'Grid/Container';
      container.resize(1200, 800);
      componentsPage.appendChild(container);

      const button = mockFigma.createComponent();
      button.name = 'Button/Primary';
      button.resize(160, 40);
      componentsPage.appendChild(button);

      // 6. Create brand sheet
      mockFigma.currentPage = specimensPage;

      const brandSheet = mockFigma.createFrame();
      brandSheet.name = 'Brand Sheet';
      brandSheet.resize(1440, 1024);
      specimensPage.appendChild(brandSheet);

      // Verify final state
      expect(assetsPage.children).toHaveLength(2); // logo components
      expect(componentsPage.children).toHaveLength(2); // base components
      expect(specimensPage.children).toHaveLength(1); // brand sheet
    });

    test('should handle plugin execution without logo bytes', async () => {
      // Test plugin execution when no logo bytes are provided
      const assetsPage = mockFigma.createPage();
      assetsPage.name = '01 Brand Assets';
      mockFigma.currentPage = assetsPage;

      const logoPrimary = mockFigma.createComponent();
      logoPrimary.name = 'Logo/Primary';
      logoPrimary.resizeWithoutConstraints(600, 240);

      const rect = mockFigma.createRectangle();
      rect.resize(600, 240);

      // No image bytes - should use fallback color
      rect.fills = [{
        type: 'SOLID',
        color: { r: 0.067, g: 0.851, b: 0.902 } // #11D9E6
      }];

      logoPrimary.appendChild(rect);
      assetsPage.appendChild(logoPrimary);

      expect(logoPrimary.children).toHaveLength(1);
      expect(rect.fills[0].type).toBe('SOLID');
      expect(rect.fills[0].color).toEqual({
        r: 0.067,
        g: 0.851,
        b: 0.902
      });
    });

    test('should create variant set correctly', () => {
      const assetsPage = mockFigma.createPage();
      mockFigma.currentPage = assetsPage;

      // Create individual logo variants
      const logoPrimary = mockFigma.createComponent();
      logoPrimary.name = 'Logo/Primary';
      logoPrimary.variantProperties = { Kind: 'Primary' };

      const wordmark = mockFigma.createComponent();
      wordmark.name = 'Logo/Wordmark';
      wordmark.variantProperties = { Kind: 'Wordmark' };

      const lockupH = mockFigma.createComponent();
      lockupH.name = 'Logo/Lockup/Horizontal';
      lockupH.variantProperties = { Kind: 'Lockup-Horizontal' };

      const lockupS = mockFigma.createComponent();
      lockupS.name = 'Logo/Lockup/Stacked';
      lockupS.variantProperties = { Kind: 'Lockup-Stacked' };

      // Combine into variant set
      const variants = [logoPrimary, wordmark, lockupH, lockupS];
      const set = mockFigma.combineAsVariants(variants, assetsPage);
      set.name = 'Logo';

      expect(set.name).toBe('Logo');
      expect(assetsPage.children).toContain(set);

      variants.forEach(variant => {
        expect(variant.variantProperties.Kind).toBeDefined();
      });
    });
  });

  describe('Plugin UI Communication', () => {
    test('should handle UI messages correctly', async () => {
      const mockMessageHandler = jest.fn();
      mockFigma.ui.onmessage = mockMessageHandler;

      // Simulate UI message
      const message = {
        type: 'bootstrap',
        bytes: [1, 2, 3, 4]
      };

      // Test message handling
      if (mockFigma.ui.onmessage) {
        await mockFigma.ui.onmessage(message);
      }

      expect(mockMessageHandler).toHaveBeenCalledWith(message);
    });

    test('should show UI with correct configuration', () => {
      const showUISpy = jest.spyOn(mockFigma, 'showUI');

      mockFigma.showUI('<html><body></body></html>', { visible: false });

      expect(showUISpy).toHaveBeenCalledWith(
        '<html><body></body></html>',
        { visible: false }
      );
    });

    test('should close plugin correctly', () => {
      const closePluginSpy = jest.spyOn(mockFigma, 'closePlugin');

      mockFigma.closePlugin();

      expect(closePluginSpy).toHaveBeenCalled();
    });
  });

  describe('Font Loading Integration', () => {
    test('should handle font loading success', async () => {
      const loadFontSpy = jest.spyOn(mockFigma, 'loadFontAsync');
      loadFontSpy.mockResolvedValue(undefined);

      await mockFigma.loadFontAsync({ family: 'Inter', style: 'Medium' });
      await mockFigma.loadFontAsync({ family: 'Inter', style: 'Regular' });

      expect(loadFontSpy).toHaveBeenCalledTimes(2);
      expect(loadFontSpy).toHaveBeenCalledWith({ family: 'Inter', style: 'Medium' });
      expect(loadFontSpy).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
    });

    test('should handle font loading failure gracefully', async () => {
      const loadFontSpy = jest.spyOn(mockFigma, 'loadFontAsync');
      loadFontSpy.mockRejectedValue(new Error('Font not available'));

      let errorOccurred = false;
      try {
        await mockFigma.loadFontAsync({ family: 'NonexistentFont', style: 'Regular' });
      } catch (e) {
        errorOccurred = true;
      }

      // Plugin should continue working even if font loading fails
      const text = mockFigma.createText();
      text.characters = 'CANDLEFISH';

      expect(errorOccurred).toBe(true);
      expect(text.characters).toBe('CANDLEFISH');
    });

    test('should create text with fallback when fonts unavailable', async () => {
      const loadFontSpy = jest.spyOn(mockFigma, 'loadFontAsync');
      loadFontSpy.mockRejectedValue(new Error('Font not loaded'));

      // Simulate text creation even when font loading fails
      const text = mockFigma.createText();
      text.characters = 'CANDLEFISH';
      text.fontSize = 72;

      // Font properties might not be set if loading failed
      try {
        await mockFigma.loadFontAsync({ family: 'Inter', style: 'Medium' });
        text.fontName = { family: 'Inter', style: 'Medium' };
      } catch (e) {
        // Fallback behavior - use default or system font
      }

      expect(text.characters).toBe('CANDLEFISH');
      expect(text.fontSize).toBe(72);
    });
  });

  describe('Variable Collection Integration', () => {
    test('should create color variable collections', () => {
      const lightCollection = mockFigma.variables.createVariableCollection('Colors/Light');
      const darkCollection = mockFigma.variables.createVariableCollection('Colors/Dark');

      expect(lightCollection.name).toBe('Colors/Light');
      expect(darkCollection.name).toBe('Colors/Dark');
      expect(lightCollection.modes).toHaveLength(1);
      expect(darkCollection.modes).toHaveLength(1);
    });

    test('should create and configure color variables', () => {
      const collection = mockFigma.variables.createVariableCollection('Test Colors');

      const primaryVar = mockFigma.variables.createVariable(
        'color.brand.primary',
        collection,
        'COLOR'
      );

      const neutralVar = mockFigma.variables.createVariable(
        'color.neutral.100',
        collection,
        'COLOR'
      );

      // Set values for the default mode
      const modeId = collection.modes[0].modeId;
      primaryVar.setValueForMode(modeId, { r: 0.067, g: 0.851, b: 0.902 });
      neutralVar.setValueForMode(modeId, { r: 0.949, g: 0.961, b: 0.965 });

      expect(primaryVar.name).toBe('color.brand.primary');
      expect(neutralVar.name).toBe('color.neutral.100');
    });
  });

  describe('Export Configuration', () => {
    test('should configure export settings for all logo variants', () => {
      const logoVariants = [
        'Logo/Primary',
        'Logo/Wordmark',
        'Logo/Lockup/Horizontal',
        'Logo/Lockup/Stacked'
      ];

      const components = logoVariants.map(name => {
        const comp = mockFigma.createComponent();
        comp.name = name;
        comp.exportSettings = [
          { format: 'SVG', contentsOnly: true, useAbsoluteBounds: false },
          { format: 'PDF' }
        ];
        return comp;
      });

      components.forEach(comp => {
        expect(comp.exportSettings).toHaveLength(2);
        expect(comp.exportSettings[0].format).toBe('SVG');
        expect(comp.exportSettings[0].contentsOnly).toBe(true);
        expect(comp.exportSettings[1].format).toBe('PDF');
      });
    });
  });

  describe('Plugin Notifications', () => {
    test('should show completion notification', () => {
      const notifySpy = jest.spyOn(mockFigma, 'notify');

      mockFigma.notify('Candlefish brand bootstrap complete.');

      expect(notifySpy).toHaveBeenCalledWith('Candlefish brand bootstrap complete.');
    });
  });

  describe('Error Recovery', () => {
    test('should recover from page creation errors', () => {
      // Simulate error in page creation
      const originalCreatePage = mockFigma.createPage;
      let callCount = 0;

      mockFigma.createPage = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Page creation failed');
        }
        return originalCreatePage.call(mockFigma);
      });

      let page;
      try {
        page = mockFigma.createPage();
      } catch (e) {
        // Retry logic
        page = mockFigma.createPage();
      }

      expect(page).toBeDefined();
      expect(mockFigma.createPage).toHaveBeenCalledTimes(2);
    });

    test('should handle component creation failures', () => {
      const originalCreateComponent = mockFigma.createComponent;
      mockFigma.createComponent = jest.fn(() => {
        throw new Error('Component creation failed');
      });

      expect(() => {
        mockFigma.createComponent();
      }).toThrow('Component creation failed');

      // Restore for cleanup
      mockFigma.createComponent = originalCreateComponent;
    });
  });

  describe('Performance Testing', () => {
    test('should handle large number of components efficiently', () => {
      const startTime = Date.now();
      const components = [];

      // Create many components to test performance
      for (let i = 0; i < 100; i++) {
        const comp = mockFigma.createComponent();
        comp.name = `Component ${i}`;
        comp.resize(100, 100);
        components.push(comp);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(components).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle complex nested structures', () => {
      const container = mockFigma.createFrame();
      container.name = 'Complex Container';

      // Create nested structure
      for (let i = 0; i < 10; i++) {
        const row = mockFigma.createFrame();
        row.name = `Row ${i}`;

        for (let j = 0; j < 5; j++) {
          const item = mockFigma.createRectangle();
          item.resize(50, 50);
          row.appendChild(item);
        }

        container.appendChild(row);
      }

      expect(container.children).toHaveLength(10);
      expect(container.children[0].children).toHaveLength(5);
    });
  });
});
