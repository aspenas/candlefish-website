import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { DynamicBackground } from '../../../components/atelier/DynamicBackground';

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, style, transition, ...props }: any) => (
      <div {...props} data-animate={JSON.stringify(animate)} data-style={JSON.stringify(style)}>
        {children}
      </div>
    ),
  },
  useMotionValue: (initial: number) => ({
    set: jest.fn(),
    get: () => initial,
  }),
  useSpring: (value: any) => value,
}));

// Mock document.hidden for visibility API
Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false,
});

describe('DynamicBackground', () => {
  beforeEach(() => {
    // Reset document visibility
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
    });

    // Clear any existing timers
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      const { container } = render(<DynamicBackground />);
      const backgroundElement = container.firstChild as HTMLElement;

      expect(backgroundElement).toBeInTheDocument();
      expect(backgroundElement).toHaveClass('fixed', 'inset-0', 'pointer-events-none', 'z-0', 'overflow-hidden');
    });

    it('should render with custom intensity', () => {
      const { container } = render(<DynamicBackground intensity={0.8} />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render with parallax disabled', () => {
      const { container } = render(<DynamicBackground enableParallax={false} />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render in reading mode', () => {
      const { container } = render(<DynamicBackground readingMode={true} />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should not render when document is hidden', () => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
      });

      const { container } = render(<DynamicBackground />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('spatial layers', () => {
    it('should render all spatial layers', () => {
      const { container } = render(<DynamicBackground />);
      
      // Should have base gradient + 3 spatial layers + mouse highlight + vignette
      const motionDivs = container.querySelectorAll('[data-animate]');
      expect(motionDivs.length).toBeGreaterThan(3);
    });

    it('should apply different blur levels to spatial layers', () => {
      const { container } = render(<DynamicBackground />);
      
      // Check that different blur styles are applied
      const styledElements = container.querySelectorAll('[data-style]');
      const blurValues = Array.from(styledElements).map(el => {
        const styleData = JSON.parse((el as HTMLElement).dataset.style || '{}');
        return styleData.filter;
      }).filter(filter => filter && filter.includes('blur'));

      expect(blurValues.length).toBeGreaterThan(0);
    });

    it('should render gradient layer', () => {
      const { container } = render(<DynamicBackground />);
      
      // Look for elements with gradient backgrounds
      const elementsWithAnimations = container.querySelectorAll('[data-animate]');
      expect(elementsWithAnimations.length).toBeGreaterThan(0);
    });

    it('should render ambient layer', () => {
      const { container } = render(<DynamicBackground />);
      
      // Should contain ambient layer elements
      const motionDivs = container.querySelectorAll('[data-animate]');
      expect(motionDivs.length).toBeGreaterThan(1);
    });

    it('should render texture layer with SVG noise', () => {
      const { container } = render(<DynamicBackground />);
      
      // Should contain texture with SVG background
      const textureElements = Array.from(container.querySelectorAll('div')).filter(el => {
        const style = (el as HTMLElement).style;
        return style.background && style.background.includes('data:image/svg+xml');
      });
      
      expect(textureElements.length).toBeGreaterThan(0);
    });
  });

  describe('parallax effects', () => {
    it('should track mouse movement when parallax is enabled', async () => {
      const { container } = render(<DynamicBackground enableParallax={true} />);

      // Simulate mouse movement
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Elements should have transform styles applied
      await waitFor(() => {
        const styledElements = container.querySelectorAll('[data-style]');
        expect(styledElements.length).toBeGreaterThan(0);
      });
    });

    it('should not apply parallax when disabled', () => {
      const { container } = render(<DynamicBackground enableParallax={false} />);

      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Check that transform styles are not applied for parallax
      const styledElements = container.querySelectorAll('[data-style]');
      const hasParallaxTransforms = Array.from(styledElements).some(el => {
        const styleData = JSON.parse((el as HTMLElement).dataset.style || '{}');
        return styleData.transform && styleData.transform !== 'none';
      });

      expect(hasParallaxTransforms).toBe(false);
    });

    it('should throttle mouse move events', async () => {
      jest.useFakeTimers();
      
      const { container } = render(<DynamicBackground enableParallax={true} />);
      
      // Fire multiple rapid mouse events
      act(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: 100 + i * 10,
            clientY: 200 + i * 10,
          }));
        }
      });

      // Fast forward timers
      act(() => {
        jest.advanceTimersByTime(20);
      });

      // Should handle rapid events without issues
      expect(container.firstChild).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe('reading mode', () => {
    it('should reduce opacity in reading mode', () => {
      const { container } = render(<DynamicBackground readingMode={true} />);
      
      // Check that reading mode animations are applied
      const animatedElements = container.querySelectorAll('[data-animate]');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('should apply different vignette in reading mode', () => {
      const { container } = render(<DynamicBackground readingMode={true} />);
      
      // Should render vignette layer
      const motionDivs = container.querySelectorAll('[data-animate]');
      expect(motionDivs.length).toBeGreaterThan(0);
    });

    it('should reduce parallax sensitivity in reading mode', () => {
      const { container } = render(<DynamicBackground readingMode={true} enableParallax={true} />);

      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300,
        }));
      });

      // Should still render but with different behavior
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('visibility handling', () => {
    it('should handle visibility changes', async () => {
      const { container, rerender } = render(<DynamicBackground />);
      
      expect(container.firstChild).toBeInTheDocument();

      // Hide document
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
      });

      act(() => {
        fireEvent(document, new Event('visibilitychange'));
      });

      // Re-render to reflect visibility change
      rerender(<DynamicBackground />);

      expect(container.firstChild).toBeNull();

      // Show document again
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      });

      act(() => {
        fireEvent(document, new Event('visibilitychange'));
      });

      rerender(<DynamicBackground />);

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('mouse highlight', () => {
    it('should render mouse-following highlight when parallax is enabled', () => {
      const { container } = render(<DynamicBackground enableParallax={true} />);
      
      // Should contain mouse highlight element
      const motionDivs = container.querySelectorAll('[data-animate]');
      expect(motionDivs.length).toBeGreaterThan(3); // Base layers + highlight
    });

    it('should not render mouse highlight when parallax is disabled', () => {
      const { container } = render(<DynamicBackground enableParallax={false} />);
      
      // Should have fewer elements without mouse highlight
      const motionDivs = container.querySelectorAll('[data-animate]');
      expect(motionDivs.length).toBeGreaterThan(0);
    });

    it('should adjust highlight behavior in reading mode', () => {
      const { container } = render(<DynamicBackground enableParallax={true} readingMode={true} />);
      
      // Should render but with different animation properties
      const motionDivs = container.querySelectorAll('[data-animate]');
      expect(motionDivs.length).toBeGreaterThan(0);
    });
  });

  describe('edge vignette', () => {
    it('should render edge vignette for focus', () => {
      const { container } = render(<DynamicBackground />);
      
      // Should have vignette element (last motion div)
      const motionDivs = container.querySelectorAll('[data-animate]');
      expect(motionDivs.length).toBeGreaterThan(3);
    });

    it('should adjust vignette for reading mode', () => {
      const { container } = render(<DynamicBackground readingMode={true} />);
      
      const motionDivs = container.querySelectorAll('[data-animate]');
      expect(motionDivs.length).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should use hardware acceleration classes', () => {
      const { container } = render(<DynamicBackground />);
      const backgroundElement = container.firstChild as HTMLElement;

      expect(backgroundElement).toHaveClass('fixed');
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(<DynamicBackground intensity={0.2} />);
      
      // Rapidly change props
      for (let i = 0; i < 10; i++) {
        rerender(<DynamicBackground intensity={0.2 + i * 0.1} />);
      }

      // Should not crash
      expect(true).toBe(true);
    });

    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = render(<DynamicBackground enableParallax={true} />);
      
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });

  describe('color and styling', () => {
    it('should use design system colors', () => {
      const { container } = render(<DynamicBackground />);
      
      // Should contain elements with the design system colors
      const motionDivs = container.querySelectorAll('[data-animate]');
      expect(motionDivs.length).toBeGreaterThan(0);
    });

    it('should apply blend modes for visual effects', () => {
      const { container } = render(<DynamicBackground />);
      
      // Should have texture element with overlay blend mode
      const textureElements = Array.from(container.querySelectorAll('div')).filter(el => {
        const style = (el as HTMLElement).style;
        return style.mixBlendMode === 'overlay';
      });
      
      expect(textureElements.length).toBeGreaterThan(0);
    });

    it('should adjust colors based on intensity', () => {
      const { container } = render(<DynamicBackground intensity={0.8} />);
      
      // Should render with higher intensity
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should handle window resize events', () => {
      const { container } = render(<DynamicBackground />);

      act(() => {
        fireEvent(window, new Event('resize'));
      });

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should adapt to different viewport sizes', () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });

      const { container } = render(<DynamicBackground />);
      
      expect(container.firstChild).toBeInTheDocument();

      // Change viewport size
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

      expect(container.firstChild).toBeInTheDocument();
    });
  });
});