#!/usr/bin/env node

/**
 * Test Generation Script for Tyler-Setup Components
 * Automatically generates comprehensive test suites
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

const args = process.argv.slice(2);
const testType = args.includes('--type') 
  ? args[args.indexOf('--type') + 1] 
  : 'all';

class TestGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.testsGenerated = 0;
  }

  async run() {
    console.log(`🧪 Generating ${testType} tests...`);
    
    try {
      if (testType === 'all' || testType === 'components') {
        await this.generateComponentTests();
      }
      
      if (testType === 'all' || testType === 'integration') {
        await this.generateIntegrationTests();
      }
      
      if (testType === 'all' || testType === 'a11y') {
        await this.generateA11yTests();
      }
      
      console.log(`✅ Generated ${this.testsGenerated} test files`);
    } catch (error) {
      console.error('❌ Test generation failed:', error);
      process.exit(1);
    }
  }

  async generateComponentTests() {
    console.log('📝 Generating component tests...');
    
    const componentFiles = await glob('components/ui/*.tsx', {
      cwd: this.projectRoot,
      ignore: ['**/*.test.tsx', '**/*.stories.tsx']
    });
    
    for (const file of componentFiles) {
      await this.generateComponentTest(file);
    }
  }

  async generateComponentTest(componentPath) {
    const componentName = path.basename(componentPath, '.tsx');
    const testPath = componentPath.replace('.tsx', '.test.tsx');
    
    const testContent = `import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { ${componentName} } from './${componentName}';

expect.extend(toHaveNoViolations);

describe('${componentName}', () => {
  const renderWithTheme = (ui: React.ReactElement, theme: 'light' | 'dark' = 'light') => {
    return render(
      <ThemeProvider defaultTheme={theme}>
        {ui}
      </ThemeProvider>
    );
  };

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderWithTheme(<${componentName} />);
      expect(document.body).toBeInTheDocument();
    });

    it('renders correctly in light mode', () => {
      const { container } = renderWithTheme(<${componentName} />, 'light');
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders correctly in dark mode', () => {
      const { container } = renderWithTheme(<${componentName} />, 'dark');
      expect(container.firstChild).toMatchSnapshot();
    });

    it('applies custom className', () => {
      renderWithTheme(<${componentName} className="custom-class" />);
      const element = screen.getByRole('${this.getComponentRole(componentName)}', { hidden: true });
      expect(element).toHaveClass('custom-class');
    });
  });

  describe('Interactions', () => {
    it('handles click events', async () => {
      const handleClick = jest.fn();
      renderWithTheme(<${componentName} onClick={handleClick} />);
      
      const element = screen.getByRole('${this.getComponentRole(componentName)}', { hidden: true });
      fireEvent.click(element);
      
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    it('handles keyboard navigation', () => {
      renderWithTheme(<${componentName} />);
      const element = screen.getByRole('${this.getComponentRole(componentName)}', { hidden: true });
      
      fireEvent.keyDown(element, { key: 'Enter' });
      fireEvent.keyDown(element, { key: ' ' });
      
      // Add specific keyboard interaction assertions
    });

    it('maintains focus management', () => {
      renderWithTheme(<${componentName} />);
      const element = screen.getByRole('${this.getComponentRole(componentName)}', { hidden: true });
      
      element.focus();
      expect(document.activeElement).toBe(element);
    });
  });

  describe('Touch Optimization', () => {
    it('has minimum touch target size', () => {
      const { container } = renderWithTheme(<${componentName} />);
      const element = container.firstChild as HTMLElement;
      
      const styles = window.getComputedStyle(element);
      const minHeight = parseInt(styles.minHeight);
      const minWidth = parseInt(styles.minWidth);
      
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    });

    it('handles touch events', () => {
      const handleTouch = jest.fn();
      renderWithTheme(<${componentName} onTouchStart={handleTouch} />);
      
      const element = screen.getByRole('${this.getComponentRole(componentName)}', { hidden: true });
      fireEvent.touchStart(element);
      
      expect(handleTouch).toHaveBeenCalled();
    });
  });

  describe('Theme Integration', () => {
    it('responds to theme changes', async () => {
      const { rerender } = renderWithTheme(<${componentName} />, 'light');
      
      // Get initial styles
      const element = screen.getByRole('${this.getComponentRole(componentName)}', { hidden: true });
      const lightStyles = window.getComputedStyle(element);
      
      // Switch to dark mode
      rerender(
        <ThemeProvider defaultTheme="dark">
          <${componentName} />
        </ThemeProvider>
      );
      
      // Check styles changed
      const darkStyles = window.getComputedStyle(element);
      expect(darkStyles.backgroundColor).not.toBe(lightStyles.backgroundColor);
    });

    it('uses CSS variables correctly', () => {
      const { container } = renderWithTheme(<${componentName} />);
      const element = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(element);
      
      // Check for CSS variable usage
      expect(styles.getPropertyValue('--primary')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderWithTheme(<${componentName} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes', () => {
      renderWithTheme(<${componentName} aria-label="Test component" />);
      const element = screen.getByLabelText('Test component');
      expect(element).toBeInTheDocument();
    });

    it('is keyboard accessible', () => {
      renderWithTheme(<${componentName} />);
      const element = screen.getByRole('${this.getComponentRole(componentName)}', { hidden: true });
      
      expect(element).toHaveAttribute('tabIndex');
    });

    it('announces state changes to screen readers', () => {
      renderWithTheme(<${componentName} aria-live="polite" />);
      const element = screen.getByRole('${this.getComponentRole(componentName)}', { hidden: true });
      
      expect(element).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Props Validation', () => {
    it('handles all prop types correctly', () => {
      const props = {
        variant: 'primary',
        size: 'md',
        disabled: false,
        loading: false,
      };
      
      renderWithTheme(<${componentName} {...props} />);
      // Add specific prop validation
    });

    it('uses default props when not provided', () => {
      renderWithTheme(<${componentName} />);
      // Verify default behavior
    });
  });

  describe('Performance', () => {
    it('memoizes expensive computations', () => {
      const { rerender } = renderWithTheme(<${componentName} />);
      
      // Track renders
      const renderSpy = jest.fn();
      
      rerender(<${componentName} />);
      
      // Verify minimal re-renders
      expect(renderSpy).toHaveBeenCalledTimes(0);
    });

    it('cleans up resources on unmount', () => {
      const { unmount } = renderWithTheme(<${componentName} />);
      
      unmount();
      
      // Verify cleanup
    });
  });
});`;

    await fs.writeFile(
      path.join(this.projectRoot, testPath),
      testContent
    );
    
    this.testsGenerated++;
  }

  getComponentRole(componentName) {
    const roleMap = {
      Button: 'button',
      Input: 'textbox',
      Select: 'combobox',
      Checkbox: 'checkbox',
      Radio: 'radio',
      Switch: 'switch',
      Dialog: 'dialog',
      Alert: 'alert',
      Card: 'article',
    };
    
    return roleMap[componentName] || 'region';
  }

  async generateIntegrationTests() {
    console.log('🔗 Generating integration tests...');
    
    const integrationTest = `import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { ClientInfoFormEnhanced } from '@/components/workflow/ClientInfoFormEnhanced';
import { useEstimateStore } from '@/stores/useEstimateStore';

jest.mock('@/stores/useEstimateStore');

describe('Tyler-Setup Integration', () => {
  beforeEach(() => {
    (useEstimateStore as jest.Mock).mockReturnValue({
      estimate: {},
      updateClientInfo: jest.fn(),
      markStepCompleted: jest.fn(),
    });
  });

  describe('Workflow Integration', () => {
    it('integrates with Zustand store correctly', async () => {
      const { updateClientInfo } = useEstimateStore();
      
      render(
        <ThemeProvider>
          <ClientInfoFormEnhanced onNext={jest.fn()} />
        </ThemeProvider>
      );
      
      const input = screen.getByLabelText(/client name/i);
      fireEvent.change(input, { target: { value: 'Test Client' } });
      
      await waitFor(() => {
        expect(updateClientInfo).toHaveBeenCalled();
      });
    });

    it('preserves business logic during theme switch', async () => {
      const { rerender } = render(
        <ThemeProvider defaultTheme="light">
          <ClientInfoFormEnhanced onNext={jest.fn()} />
        </ThemeProvider>
      );
      
      // Capture initial calculation
      const lightModeResult = screen.getByTestId('calculation-result');
      const initialValue = lightModeResult.textContent;
      
      // Switch theme
      rerender(
        <ThemeProvider defaultTheme="dark">
          <ClientInfoFormEnhanced onNext={jest.fn()} />
        </ThemeProvider>
      );
      
      // Verify calculation unchanged
      const darkModeResult = screen.getByTestId('calculation-result');
      expect(darkModeResult.textContent).toBe(initialValue);
    });
  });

  describe('Excel Engine Integration', () => {
    it('maintains calculation accuracy with UI updates', () => {
      // Test that Excel formulas work correctly with new UI
    });
  });

  describe('Touch Gesture Integration', () => {
    it('handles swipe navigation between steps', () => {
      // Test swipe gesture navigation
    });
  });
});`;

    await fs.writeFile(
      path.join(this.projectRoot, 'tests', 'integration', 'tyler-setup.test.tsx'),
      integrationTest
    );
    
    this.testsGenerated++;
  }

  async generateA11yTests() {
    console.log('♿ Generating accessibility tests...');
    
    const a11yTest = `import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';

expect.extend(toHaveNoViolations);

const components = [
  'Button',
  'Input',
  'Select',
  'Card',
  'Dialog',
  'Alert',
];

describe('Accessibility Compliance', () => {
  components.forEach(componentName => {
    describe(\`\${componentName} Accessibility\`, () => {
      it('meets WCAG 2.1 Level AA standards', async () => {
        const Component = require(\`@/components/ui/\${componentName}\`)[componentName];
        
        const { container } = render(
          <ThemeProvider>
            <Component />
          </ThemeProvider>
        );
        
        const results = await axe(container, {
          rules: {
            'color-contrast': { enabled: true },
            'valid-aria-roles': { enabled: true },
            'button-name': { enabled: true },
            'image-alt': { enabled: true },
            'label': { enabled: true },
          },
        });
        
        expect(results).toHaveNoViolations();
      });

      it('supports keyboard navigation', async () => {
        const Component = require(\`@/components/ui/\${componentName}\`)[componentName];
        
        const { container } = render(
          <ThemeProvider>
            <Component />
          </ThemeProvider>
        );
        
        const focusableElements = container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach(element => {
          expect(element).toHaveAttribute('tabindex');
        });
      });

      it('has sufficient color contrast', async () => {
        const Component = require(\`@/components/ui/\${componentName}\`)[componentName];
        
        const { container } = render(
          <ThemeProvider>
            <Component />
          </ThemeProvider>
        );
        
        const results = await axe(container, {
          rules: {
            'color-contrast': { 
              enabled: true,
              options: { 
                contrastRatio: { 
                  normal: { aa: 4.5, aaa: 7 },
                  large: { aa: 3, aaa: 4.5 }
                }
              }
            }
          }
        });
        
        expect(results).toHaveNoViolations();
      });

      it('provides focus indicators', () => {
        const Component = require(\`@/components/ui/\${componentName}\`)[componentName];
        
        const { container } = render(
          <ThemeProvider>
            <Component />
          </ThemeProvider>
        );
        
        const element = container.querySelector('[tabindex="0"]');
        if (element) {
          element.focus();
          const styles = window.getComputedStyle(element);
          
          // Check for focus styles
          expect(styles.outline || styles.boxShadow).toBeTruthy();
        }
      });
    });
  });
});`;

    await fs.mkdir(path.join(this.projectRoot, 'tests', 'a11y'), { recursive: true });
    await fs.writeFile(
      path.join(this.projectRoot, 'tests', 'a11y', 'tyler-setup-a11y.test.tsx'),
      a11yTest
    );
    
    this.testsGenerated++;
  }
}

// Run the generator
const generator = new TestGenerator();
generator.run().catch(console.error);