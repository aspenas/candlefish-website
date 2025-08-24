/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtensionCard } from '../../../components/netlify/ExtensionCard';
import { createMockExtension, createMockDeploymentImpact } from '../../factories/netlify-factory';

describe('ExtensionCard', () => {
  const mockOnToggle = jest.fn();
  const mockOnConfigure = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render extension information correctly', () => {
      const extension = createMockExtension({
        name: 'Smart Cache Control',
        description: 'Advanced caching strategies for optimal performance',
        category: 'performance',
        version: '2.1.0',
        provider: 'Netlify Labs',
        icon: '⚡'
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      expect(screen.getByText('Smart Cache Control')).toBeInTheDocument();
      expect(screen.getByText('Advanced caching strategies for optimal performance')).toBeInTheDocument();
      expect(screen.getByText('v2.1.0')).toBeInTheDocument();
      expect(screen.getByText('Netlify Labs')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
    });

    it('should show correct category badge', () => {
      const performanceExtension = createMockExtension({ category: 'performance' });
      const { rerender } = render(
        <ExtensionCard
          extension={performanceExtension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      expect(screen.getByText('Performance')).toBeInTheDocument();

      const securityExtension = createMockExtension({ category: 'security' });
      rerender(
        <ExtensionCard
          extension={securityExtension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    it('should display performance impact information', () => {
      const extension = createMockExtension({
        performance: {
          impact: 'high',
          loadTime: 250,
          bundleSize: 35
        }
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      expect(screen.getByText('High Impact')).toBeInTheDocument();
      expect(screen.getByText('250ms')).toBeInTheDocument();
      expect(screen.getByText('35KB')).toBeInTheDocument();
    });

    it('should show usage metrics when available', () => {
      const extension = createMockExtension({
        metrics: {
          usage: 5420,
          errors: 12,
          lastUsed: new Date('2024-01-20T14:30:00Z')
        }
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={true}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      expect(screen.getByText('5,420 uses')).toBeInTheDocument();
      expect(screen.getByText('12 errors')).toBeInTheDocument();
      expect(screen.getByText(/last used/i)).toBeInTheDocument();
    });
  });

  describe('Extension State', () => {
    it('should render enabled state correctly', () => {
      const extension = createMockExtension();
      render(
        <ExtensionCard
          extension={extension}
          isEnabled={true}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const toggle = screen.getByRole('switch');
      expect(toggle).toBeChecked();
      expect(screen.getByText('Enabled')).toBeInTheDocument();

      // Card should have enabled styling
      const card = screen.getByTestId('extension-card');
      expect(card).toHaveClass('border-operation-active');
    });

    it('should render disabled state correctly', () => {
      const extension = createMockExtension();
      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();
      expect(screen.getByText('Disabled')).toBeInTheDocument();

      // Card should have disabled styling
      const card = screen.getByTestId('extension-card');
      expect(card).toHaveClass('border-gray-700');
    });

    it('should show loading state during toggle operations', async () => {
      const extension = createMockExtension();

      // Mock a slow toggle operation
      const slowToggle = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={slowToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(toggle).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('should call onToggle when switch is clicked', async () => {
      const extension = createMockExtension({ id: 'test-ext-123' });
      mockOnToggle.mockResolvedValue(undefined);

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      expect(mockOnToggle).toHaveBeenCalledWith('test-ext-123', true);
    });

    it('should call onConfigure when configure button is clicked', async () => {
      const extension = createMockExtension({ id: 'test-ext-123' });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={true}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const configureButton = screen.getByRole('button', { name: /configure/i });
      await user.click(configureButton);

      expect(mockOnConfigure).toHaveBeenCalledWith('test-ext-123');
    });

    it('should disable configure button when extension is disabled', () => {
      const extension = createMockExtension();

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const configureButton = screen.getByRole('button', { name: /configure/i });
      expect(configureButton).toBeDisabled();
    });

    it('should handle toggle errors gracefully', async () => {
      const extension = createMockExtension({ id: 'test-ext-123' });
      mockOnToggle.mockRejectedValue(new Error('API Error'));

      // Mock console.error to avoid test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      await waitFor(() => {
        expect(toggle).not.toBeDisabled(); // Should re-enable after error
        expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle extension:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Deployment Impact Display', () => {
    it('should show impact data when provided', () => {
      const extension = createMockExtension();
      const impact = createMockDeploymentImpact({
        impact: {
          performance: 15, // 15% improvement
          buildTime: -20,   // 20% faster builds
          bundleSize: -25   // 25KB reduction
        }
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={true}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
          showImpact={true}
          impact={impact}
        />
      );

      expect(screen.getByText('+15%')).toBeInTheDocument();
      expect(screen.getByText('-20%')).toBeInTheDocument();
      expect(screen.getByText('-25KB')).toBeInTheDocument();
      expect(screen.getByText('Performance Impact')).toBeInTheDocument();
    });

    it('should not show impact section when showImpact is false', () => {
      const extension = createMockExtension();
      const impact = createMockDeploymentImpact();

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={true}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
          showImpact={false}
          impact={impact}
        />
      );

      expect(screen.queryByText('Performance Impact')).not.toBeInTheDocument();
    });

    it('should show impact colors correctly', () => {
      const extension = createMockExtension();
      const impact = createMockDeploymentImpact({
        impact: {
          performance: 15,  // Positive - green
          buildTime: -10,   // Negative (faster) - green
          bundleSize: 5     // Positive (bigger) - red
        }
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={true}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
          showImpact={true}
          impact={impact}
        />
      );

      const performanceValue = screen.getByText('+15%');
      const buildTimeValue = screen.getByText('-10%');
      const bundleSizeValue = screen.getByText('+5KB');

      expect(performanceValue).toHaveClass('text-operation-complete');
      expect(buildTimeValue).toHaveClass('text-operation-complete');
      expect(bundleSizeValue).toHaveClass('text-operation-alert');
    });
  });

  describe('Documentation Links', () => {
    it('should render documentation links when provided', () => {
      const extension = createMockExtension({
        documentation: {
          setupUrl: 'https://docs.example.com/setup',
          apiUrl: 'https://api.example.com/docs'
        }
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const setupLink = screen.getByRole('link', { name: /setup guide/i });
      const apiLink = screen.getByRole('link', { name: /api docs/i });

      expect(setupLink).toHaveAttribute('href', 'https://docs.example.com/setup');
      expect(apiLink).toHaveAttribute('href', 'https://api.example.com/docs');
      expect(setupLink).toHaveAttribute('target', '_blank');
      expect(apiLink).toHaveAttribute('target', '_blank');
    });

    it('should not render documentation section when links are missing', () => {
      const extension = createMockExtension({
        documentation: {}
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      expect(screen.queryByText(/setup guide/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/api docs/i)).not.toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should show error indicator when extension has high error count', () => {
      const extension = createMockExtension({
        metrics: {
          usage: 1000,
          errors: 150, // High error rate (15%)
          lastUsed: new Date()
        }
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={true}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      expect(screen.getByText('150 errors')).toBeInTheDocument();
      expect(screen.getByTestId('error-warning')).toBeInTheDocument();
    });

    it('should show warning for extensions with high performance impact', () => {
      const extension = createMockExtension({
        performance: {
          impact: 'high',
          loadTime: 500, // Very slow
          bundleSize: 100 // Large bundle
        }
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      expect(screen.getByTestId('performance-warning')).toBeInTheDocument();
      expect(screen.getByText(/high performance impact/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      const extension = createMockExtension({
        name: 'Cache Control',
        description: 'Advanced caching for better performance'
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label', 'Enable Cache Control extension');
      expect(toggle).toHaveAttribute('aria-describedby', expect.stringContaining('description'));

      const configureButton = screen.getByRole('button', { name: /configure/i });
      expect(configureButton).toHaveAttribute('aria-label', 'Configure Cache Control extension');
    });

    it('should announce state changes to screen readers', async () => {
      const extension = createMockExtension();
      mockOnToggle.mockResolvedValue(undefined);

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/extension toggled/i);
      });
    });

    it('should support keyboard navigation', async () => {
      const extension = createMockExtension();

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={true}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      // Tab to toggle
      await user.tab();
      expect(screen.getByRole('switch')).toHaveFocus();

      // Tab to configure button
      await user.tab();
      expect(screen.getByRole('button', { name: /configure/i })).toHaveFocus();

      // Space/Enter should activate buttons
      await user.keyboard('[Enter]');
      expect(mockOnConfigure).toHaveBeenCalled();
    });

    it('should have proper focus management during loading states', async () => {
      const extension = createMockExtension();
      const slowToggle = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={slowToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      // Focus should remain on the toggle during loading
      expect(toggle).toHaveFocus();
      expect(toggle).toBeDisabled();

      await waitFor(() => {
        expect(toggle).not.toBeDisabled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      const extension = createMockExtension();

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const card = screen.getByTestId('extension-card');
      expect(card).toHaveClass('flex-col', 'sm:flex-row');
    });

    it('should stack elements vertically on small screens', () => {
      const extension = createMockExtension({
        performance: {
          impact: 'high',
          loadTime: 200,
          bundleSize: 30
        }
      });

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const metricsSection = screen.getByTestId('performance-metrics');
      expect(metricsSection).toHaveClass('flex-col', 'md:flex-row');
    });
  });

  describe('Animation and Interactions', () => {
    it('should have smooth transitions for state changes', async () => {
      const extension = createMockExtension();
      mockOnToggle.mockResolvedValue(undefined);

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={false}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const card = screen.getByTestId('extension-card');
      expect(card).toHaveClass('transition-all', 'duration-200');

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      // Should have transition classes
      expect(toggle.parentElement).toHaveClass('transition-colors');
    });

    it('should show hover effects on interactive elements', async () => {
      const extension = createMockExtension();

      render(
        <ExtensionCard
          extension={extension}
          isEnabled={true}
          onToggle={mockOnToggle}
          onConfigure={mockOnConfigure}
        />
      );

      const configureButton = screen.getByRole('button', { name: /configure/i });

      await user.hover(configureButton);

      expect(configureButton).toHaveClass('hover:bg-operation-active/10');
    });
  });
});
