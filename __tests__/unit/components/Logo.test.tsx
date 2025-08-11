import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Logo } from '@/components/Logo';

describe('Logo Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Logo />);

      const logoContainer = screen.getByRole('img', { name: /candlefish ai/i });
      const logoText = screen.getByText('CANDLEFISH');

      expect(logoContainer).toBeInTheDocument();
      expect(logoText).toBeInTheDocument();
      expect(logoContainer).toHaveStyle({ height: '32px' });
    });

    it('renders icon variant without text', () => {
      render(<Logo variant="icon" />);

      const logoContainer = screen.getByRole('img', { name: /candlefish ai/i });
      const logoText = screen.queryByText('CANDLEFISH');

      expect(logoContainer).toBeInTheDocument();
      expect(logoText).not.toBeInTheDocument();
    });

    it('renders stacked variant correctly', () => {
      render(<Logo variant="stacked" />);

      const container = screen.getByText('CANDLEFISH').closest('.candlefish-logo');

      expect(container).toHaveClass('candlefish-logo--stacked');
    });

    it('renders horizontal variant by default', () => {
      render(<Logo />);

      const container = screen.getByText('CANDLEFISH').closest('.candlefish-logo');

      expect(container).toHaveClass('candlefish-logo--horizontal');
    });
  });

  describe('Sizing', () => {
    const sizeTests = [
      { size: 'sm' as const, expectedHeight: '24px', expectedFontSize: '1rem' },
      { size: 'md' as const, expectedHeight: '32px', expectedFontSize: '1.25rem' },
      { size: 'lg' as const, expectedHeight: '48px', expectedFontSize: '1.5rem' },
      { size: 'xl' as const, expectedHeight: '80px', expectedFontSize: '2rem' },
    ];

    sizeTests.forEach(({ size, expectedHeight, expectedFontSize }) => {
      it(`renders ${size} size correctly`, () => {
        render(<Logo size={size} />);

        const logoImage = screen.getByRole('img', { name: /candlefish ai/i });
        const logoText = screen.getByText('CANDLEFISH');

        expect(logoImage).toHaveStyle({ height: expectedHeight });
        expect(logoText).toHaveStyle({ fontSize: expectedFontSize });
      });
    });
  });

  describe('Props', () => {
    it('applies custom className', () => {
      render(<Logo className="custom-logo" />);

      const container = screen.getByText('CANDLEFISH').closest('.candlefish-logo');

      expect(container).toHaveClass('custom-logo');
    });

    it('hides text when showText is false', () => {
      render(<Logo showText={false} />);

      const logoText = screen.queryByText('CANDLEFISH');

      expect(logoText).not.toBeInTheDocument();
    });

    it('disables animation when animated is false', () => {
      render(<Logo animated={false} />);

      const container = screen.getByRole('img', { name: /candlefish ai/i }).closest('.candlefish-logo');

      expect(container).not.toHaveClass('candlefish-logo--animated');
    });

    it('enables animation by default', () => {
      render(<Logo />);

      const container = screen.getByRole('img', { name: /candlefish ai/i }).closest('.candlefish-logo');

      expect(container).toHaveClass('candlefish-logo--animated');
    });
  });

  describe('Accessibility', () => {
    it('has proper alt text', () => {
      render(<Logo />);

      const logoImage = screen.getByRole('img', { name: /candlefish ai/i });

      expect(logoImage).toHaveAttribute('alt', 'Candlefish AI');
    });

    it('is keyboard accessible when animated', () => {
      render(<Logo />);

      const container = screen.getByText('CANDLEFISH').closest('.candlefish-logo');

      // Should be focusable if interactive
      expect(container).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Image Loading', () => {
    it('uses correct image source', () => {
      render(<Logo />);

      const logoImage = screen.getByRole('img', { name: /candlefish ai/i });

      expect(logoImage).toHaveAttribute('src', '/logo/candlefish_original.png');
    });

    it('maintains aspect ratio', () => {
      render(<Logo />);

      const logoImage = screen.getByRole('img', { name: /candlefish ai/i });

      expect(logoImage).toHaveStyle({ width: 'auto' });
    });
  });

  describe('Responsive Behavior', () => {
    it('applies responsive classes', () => {
      render(<Logo />);

      const container = screen.getByText('CANDLEFISH').closest('.candlefish-logo');

      expect(container).toHaveClass('candlefish-logo');
      expect(container).toHaveClass('candlefish-logo--md');
    });
  });

  describe('Animation States', () => {
    it('applies hover classes correctly', () => {
      render(<Logo animated />);

      const logoMark = screen.getByRole('img', { name: /candlefish ai/i }).closest('.candlefish-logo__mark');

      expect(logoMark).toHaveClass('candlefish-glow');
    });
  });

  describe('CSS Classes', () => {
    it('applies correct CSS classes for horizontal variant', () => {
      render(<Logo variant="horizontal" />);

      const container = screen.getByText('CANDLEFISH').closest('.candlefish-logo');

      expect(container).toHaveClass('candlefish-logo--horizontal');
    });

    it('applies correct CSS classes for stacked variant', () => {
      render(<Logo variant="stacked" />);

      const container = screen.getByText('CANDLEFISH').closest('.candlefish-logo');

      expect(container).toHaveClass('candlefish-logo--stacked');
    });

    it('applies correct CSS classes for icon variant', () => {
      render(<Logo variant="icon" />);

      const container = screen.getByRole('img', { name: /candlefish ai/i }).closest('.candlefish-logo');

      expect(container).toHaveClass('candlefish-logo--icon');
    });
  });

  describe('Error Handling', () => {
    it('handles missing image gracefully', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<Logo />);

      const logoImage = screen.getByRole('img', { name: /candlefish ai/i });

      // Simulate image load error
      fireEvent.error(logoImage);

      // Component should still be rendered
      expect(logoImage).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('renders quickly with multiple instances', () => {
      const startTime = performance.now();

      const { rerender } = render(<Logo />);

      // Re-render multiple times to test performance
      for (let i = 0; i < 10; i++) {
        rerender(<Logo size={i % 2 === 0 ? 'sm' : 'lg'} />);
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly (less than 100ms for multiple re-renders)
      expect(renderTime).toBeLessThan(100);
    });
  });
});
