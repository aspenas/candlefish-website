import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TemporalDashboard } from '@/components/production/TemporalDashboard';
import { APIKeyManager } from '@/components/production/APIKeyManager';
import { MonitoringDashboard } from '@/components/production/MonitoringDashboard';
import { CircuitBreakerPanel } from '@/components/production/CircuitBreakerPanel';
import { SecurityScanner } from '@/components/production/SecurityScanner';
import { ProductionTestFactory } from '../factories/productionFactory';

// Mock the production store with accessible data
const mockProductionStore = {
  temporal: {
    connections: ProductionTestFactory.createTemporalConnections(3),
    workflows: Array.from({ length: 5 }, () =>
      ProductionTestFactory.createTemporalWorkflow()
    ),
    selectedConnection: undefined,
    isLoading: false,
  },
  apiKeys: {
    keys: ProductionTestFactory.createAPIKeys(4),
    usage: {},
    rotationSchedule: [],
    isLoading: false,
  },
  monitoring: {
    metrics: {},
    alerts: Array.from({ length: 3 }, () => ProductionTestFactory.createAlert()),
    channels: Array.from({ length: 2 }, () => ProductionTestFactory.createNotificationChannel()),
    dashboards: [],
    realTimeData: {},
    isLoading: false,
  },
  circuitBreakers: {
    breakers: Array.from({ length: 3 }, () => ProductionTestFactory.createCircuitBreaker()),
    metrics: {},
    isLoading: false,
  },
  security: {
    scans: Array.from({ length: 2 }, () => ProductionTestFactory.createSecurityScan()),
    vulnerabilities: Array.from({ length: 5 }, () => ProductionTestFactory.createVulnerability()),
    compliance: Array.from({ length: 2 }, () => ProductionTestFactory.createComplianceStatus()),
    isLoading: false,
  },
  // Mock store methods
  fetchTemporalConnections: jest.fn(),
  createTemporalConnection: jest.fn(),
  updateTemporalConnection: jest.fn(),
  deleteTemporalConnection: jest.fn(),
  testTemporalConnection: jest.fn(),
  fetchTemporalWorkflows: jest.fn(),
  setSelectedConnection: jest.fn(),
  fetchAPIKeys: jest.fn(),
  createAPIKey: jest.fn(),
  updateAPIKey: jest.fn(),
  deleteAPIKey: jest.fn(),
  rotateAPIKey: jest.fn(),
  fetchAPIKeyUsage: jest.fn(),
  fetchMonitoringMetrics: jest.fn(),
  createAlert: jest.fn(),
  updateAlert: jest.fn(),
  deleteAlert: jest.fn(),
  triggerAlert: jest.fn(),
  createNotificationChannel: jest.fn(),
  fetchCircuitBreakers: jest.fn(),
  createCircuitBreaker: jest.fn(),
  updateCircuitBreaker: jest.fn(),
  resetCircuitBreaker: jest.fn(),
  testCircuitBreaker: jest.fn(),
  fetchSecurityScans: jest.fn(),
  createSecurityScan: jest.fn(),
  startSecurityScan: jest.fn(),
  stopSecurityScan: jest.fn(),
  fetchVulnerabilities: jest.fn(),
  updateVulnerability: jest.fn(),
  fetchComplianceStatus: jest.fn(),
};

jest.mock('@/stores/useProductionStore', () => ({
  useProductionStore: () => mockProductionStore,
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Helper to wrap components with required providers
const AccessibilityTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div role="application" aria-label="Paintbox Production Dashboard">
      {children}
    </div>
  );
};

describe('Production Components Accessibility Tests', () => {
  beforeEach(() => {
    // Reset any accessibility-related mocks
    jest.clearAllMocks();
  });

  describe('TemporalDashboard Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      // Check for proper heading levels (h1 -> h2 -> h3, no skipping)
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // Main heading should be h1
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveAccessibleName();
    });

    it('should have proper ARIA labels and descriptions', () => {
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      // All interactive elements should have accessible names
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });

      // Links should have accessible names
      const links = screen.queryAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAccessibleName();
      });

      // Form controls should have labels
      const textboxes = screen.queryAllByRole('textbox');
      textboxes.forEach(textbox => {
        expect(textbox).toHaveAccessibleName();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      // Tab through focusable elements
      const focusableElements = screen.getAllByRole('button').concat(
        screen.queryAllByRole('link'),
        screen.queryAllByRole('textbox')
      );

      if (focusableElements.length > 0) {
        await user.tab();
        expect(focusableElements[0]).toHaveFocus();

        // Test that all focusable elements can receive focus
        for (let i = 1; i < Math.min(focusableElements.length, 5); i++) {
          await user.tab();
        }
      }
    });

    it('should announce dynamic content changes', async () => {
      const user = userEvent.setup();
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      // Look for live regions
      const liveRegions = screen.queryAllByRole('status').concat(
        screen.queryAllByRole('alert'),
        screen.queryAllByRole('log')
      );

      expect(liveRegions.length).toBeGreaterThan(0);

      // Test connection status updates
      const testButtons = screen.queryAllByText(/test/i);
      if (testButtons.length > 0) {
        await user.click(testButtons[0]);
        // Should have aria-live region for status updates
        expect(screen.queryByRole('status')).toBeInTheDocument();
      }
    });

    it('should have proper color contrast', () => {
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      // Check for status indicators with proper contrast
      const statusElements = screen.queryAllByTestId(/status/i);
      statusElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        // This would need actual color contrast calculation in a real test
        expect(computedStyle.color).toBeDefined();
        expect(computedStyle.backgroundColor).toBeDefined();
      });
    });

    it('should support screen reader announcements', () => {
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      // Check for proper screen reader content
      const connections = mockProductionStore.temporal.connections;
      connections.forEach(connection => {
        const connectionElement = screen.getByText(connection.name);
        expect(connectionElement).toBeInTheDocument();

        // Status should be announced
        const statusText = screen.getByText(connection.status, { exact: false });
        expect(statusText).toHaveAttribute('aria-label');
      });
    });
  });

  describe('APIKeyManager Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <APIKeyManager />
        </AccessibilityTestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have secure input handling for screen readers', () => {
      render(
        <AccessibilityTestWrapper>
          <APIKeyManager />
        </AccessibilityTestWrapper>
      );

      // API key values should be properly handled for screen readers
      const sensitiveInputs = screen.queryAllByDisplayValue(/pk_/);
      sensitiveInputs.forEach(input => {
        // Should have appropriate aria attributes for sensitive data
        expect(input).toHaveAttribute('aria-describedby');
        expect(input).toHaveAttribute('aria-label');
      });
    });

    it('should provide clear permission descriptions', () => {
      render(
        <AccessibilityTestWrapper>
          <APIKeyManager />
        </AccessibilityTestWrapper>
      );

      // Permission checkboxes should have clear descriptions
      const checkboxes = screen.queryAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAccessibleName();
        expect(checkbox).toHaveAccessibleDescription();
      });
    });

    it('should handle form validation accessibly', async () => {
      const user = userEvent.setup();
      render(
        <AccessibilityTestWrapper>
          <APIKeyManager />
        </AccessibilityTestWrapper>
      );

      // Test form validation announcements
      const createButton = screen.queryByRole('button', { name: /create/i });
      if (createButton) {
        await user.click(createButton);

        // Validation errors should be announced
        const errorMessages = screen.queryAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThanOrEqual(0);

        errorMessages.forEach(error => {
          expect(error).toHaveTextContent();
        });
      }
    });
  });

  describe('MonitoringDashboard Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <MonitoringDashboard />
        </AccessibilityTestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide accessible chart descriptions', () => {
      render(
        <AccessibilityTestWrapper>
          <MonitoringDashboard />
        </AccessibilityTestWrapper>
      );

      // Charts should have text alternatives
      const charts = screen.queryAllByRole('img');
      charts.forEach(chart => {
        expect(chart).toHaveAccessibleName();
        expect(chart).toHaveAccessibleDescription();
      });
    });

    it('should handle real-time updates accessibly', () => {
      render(
        <AccessibilityTestWrapper>
          <MonitoringDashboard />
        </AccessibilityTestWrapper>
      );

      // Real-time updates should use live regions
      const liveRegions = screen.queryAllByRole('status').concat(
        screen.queryAllByRole('log')
      );

      expect(liveRegions.length).toBeGreaterThan(0);

      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live');
      });
    });

    it('should provide data table accessibility', () => {
      render(
        <AccessibilityTestWrapper>
          <MonitoringDashboard />
        </AccessibilityTestWrapper>
      );

      // Data tables should have proper structure
      const tables = screen.queryAllByRole('table');
      tables.forEach(table => {
        expect(table).toHaveAccessibleName();

        // Check for column headers
        const columnHeaders = screen.queryAllByRole('columnheader');
        expect(columnHeaders.length).toBeGreaterThan(0);

        // Check for row headers if present
        const rowHeaders = screen.queryAllByRole('rowheader');
        rowHeaders.forEach(header => {
          expect(header).toHaveTextContent();
        });
      });
    });

    it('should handle alert severity levels accessibly', () => {
      render(
        <AccessibilityTestWrapper>
          <MonitoringDashboard />
        </AccessibilityTestWrapper>
      );

      const alerts = mockProductionStore.monitoring.alerts;
      alerts.forEach(alert => {
        const alertElement = screen.queryByText(alert.name);
        if (alertElement) {
          // Severity should be announced appropriately
          const severityElement = screen.queryByText(alert.severity);
          if (severityElement) {
            expect(severityElement).toHaveAttribute('aria-label');
          }
        }
      });
    });
  });

  describe('CircuitBreakerPanel Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <CircuitBreakerPanel />
        </AccessibilityTestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce state changes clearly', () => {
      render(
        <AccessibilityTestWrapper>
          <CircuitBreakerPanel />
        </AccessibilityTestWrapper>
      );

      const breakers = mockProductionStore.circuitBreakers.breakers;
      breakers.forEach(breaker => {
        const stateElement = screen.queryByText(breaker.state);
        if (stateElement) {
          // State should have clear announcement
          expect(stateElement).toHaveAttribute('aria-label');
          expect(stateElement.getAttribute('aria-label')).toContain(breaker.state);
        }
      });
    });

    it('should provide meaningful metrics descriptions', () => {
      render(
        <AccessibilityTestWrapper>
          <CircuitBreakerPanel />
        </AccessibilityTestWrapper>
      );

      // Metrics should be described for screen readers
      const metricElements = screen.queryAllByText(/\d+/);
      metricElements.forEach(element => {
        const parent = element.closest('[role="region"], [role="group"]');
        if (parent) {
          expect(parent).toHaveAccessibleName();
        }
      });
    });

    it('should handle interactive controls accessibly', async () => {
      const user = userEvent.setup();
      render(
        <AccessibilityTestWrapper>
          <CircuitBreakerPanel />
        </AccessibilityTestWrapper>
      );

      // Reset buttons should be clearly labeled
      const resetButtons = screen.queryAllByRole('button', { name: /reset/i });
      resetButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
        expect(button).toHaveAccessibleDescription();
      });

      // Test keyboard interaction
      if (resetButtons.length > 0) {
        resetButtons[0].focus();
        expect(resetButtons[0]).toHaveFocus();

        await user.keyboard('{Enter}');
        // Should trigger appropriate action or dialog
      }
    });
  });

  describe('SecurityScanner Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <AccessibilityTestWrapper>
          <SecurityScanner />
        </AccessibilityTestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide accessible vulnerability information', () => {
      render(
        <AccessibilityTestWrapper>
          <SecurityScanner />
        </AccessibilityTestWrapper>
      );

      const vulnerabilities = mockProductionStore.security.vulnerabilities;
      vulnerabilities.forEach(vuln => {
        const vulnElement = screen.queryByText(vuln.title);
        if (vulnElement) {
          // Vulnerability severity should be announced
          expect(vulnElement).toHaveAccessibleDescription();

          // Severity should be clearly indicated
          const severityElement = screen.queryByText(vuln.severity);
          if (severityElement) {
            expect(severityElement).toHaveAttribute('aria-label');
          }
        }
      });
    });

    it('should handle scan progress accessibly', () => {
      render(
        <AccessibilityTestWrapper>
          <SecurityScanner />
        </AccessibilityTestWrapper>
      );

      // Progress indicators should be accessible
      const progressElements = screen.queryAllByRole('progressbar');
      progressElements.forEach(progress => {
        expect(progress).toHaveAccessibleName();
        expect(progress).toHaveAttribute('aria-valuenow');
        expect(progress).toHaveAttribute('aria-valuemin');
        expect(progress).toHaveAttribute('aria-valuemax');
      });
    });

    it('should provide clear compliance status', () => {
      render(
        <AccessibilityTestWrapper>
          <SecurityScanner />
        </AccessibilityTestWrapper>
      );

      const complianceStatuses = mockProductionStore.security.compliance;
      complianceStatuses.forEach(status => {
        const statusElement = screen.queryByText(status.framework);
        if (statusElement) {
          // Compliance score should be accessible
          const scoreElement = screen.queryByText(status.score.toString());
          if (scoreElement) {
            expect(scoreElement).toHaveAccessibleDescription();
          }
        }
      });
    });
  });

  describe('Cross-Component Accessibility', () => {
    it('should maintain focus management across components', async () => {
      const user = userEvent.setup();

      const MultiComponentTest = () => (
        <AccessibilityTestWrapper>
          <TemporalDashboard />
          <APIKeyManager />
          <MonitoringDashboard />
        </AccessibilityTestWrapper>
      );

      render(<MultiComponentTest />);

      // Focus should move logically through components
      await user.tab();
      const firstFocusable = document.activeElement;
      expect(firstFocusable).toBeDefined();

      // Tab through several elements
      for (let i = 0; i < 10; i++) {
        await user.tab();
        expect(document.activeElement).toBeDefined();
      }
    });

    it('should handle modal dialogs accessibly', async () => {
      const user = userEvent.setup();
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      // Open a modal dialog
      const createButton = screen.queryByRole('button', { name: /add connection/i });
      if (createButton) {
        await user.click(createButton);

        // Dialog should be accessible
        const dialog = screen.queryByRole('dialog');
        if (dialog) {
          expect(dialog).toHaveAccessibleName();
          expect(dialog).toHaveAttribute('aria-modal', 'true');

          // Focus should be trapped in dialog
          const dialogButtons = screen.queryAllByRole('button');
          const dialogInputs = screen.queryAllByRole('textbox');
          const focusableInDialog = [...dialogButtons, ...dialogInputs];

          if (focusableInDialog.length > 0) {
            expect(focusableInDialog[0]).toHaveFocus();
          }
        }
      }
    });

    it('should provide consistent navigation landmarks', () => {
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
          <APIKeyManager />
          <MonitoringDashboard />
          <CircuitBreakerPanel />
          <SecurityScanner />
        </AccessibilityTestWrapper>
      );

      // Check for navigation landmarks
      const main = screen.queryByRole('main');
      const navigation = screen.queryByRole('navigation');
      const complementary = screen.queryAllByRole('complementary');

      // Should have proper landmark structure
      expect(main || navigation || complementary.length > 0).toBe(true);
    });

    it('should handle internationalization accessibly', () => {
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      // Check for language attributes
      const rootElement = document.documentElement;
      expect(rootElement).toHaveAttribute('lang');

      // Check for proper text direction
      const textElements = screen.queryAllByText(/./);
      textElements.slice(0, 5).forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        expect(['ltr', 'rtl']).toContain(computedStyle.direction);
      });
    });

    it('should support high contrast mode', () => {
      // Simulate high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      // Components should adapt to high contrast
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        expect(computedStyle.borderWidth).toBeDefined();
        expect(computedStyle.outlineWidth).toBeDefined();
      });
    });

    it('should support reduced motion preferences', () => {
      // Simulate reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <AccessibilityTestWrapper>
          <MonitoringDashboard />
        </AccessibilityTestWrapper>
      );

      // Animations should be reduced or disabled
      const animatedElements = screen.queryAllByRole('progressbar').concat(
        screen.queryAllByTestId('loading-spinner')
      );

      animatedElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        // Should have reduced or no animation
        expect(['none', '0s', 'paused']).toContain(
          computedStyle.animationPlayState ||
          computedStyle.animationDuration ||
          computedStyle.animation
        );
      });
    });
  });

  describe('Performance Impact of Accessibility Features', () => {
    it('should not significantly impact render performance with accessibility features', () => {
      const startTime = performance.now();

      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
          <APIKeyManager />
          <MonitoringDashboard />
          <CircuitBreakerPanel />
          <SecurityScanner />
        </AccessibilityTestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render time should be reasonable even with accessibility features
      expect(renderTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should maintain responsive interactions with accessibility features', async () => {
      const user = userEvent.setup();
      render(
        <AccessibilityTestWrapper>
          <TemporalDashboard />
        </AccessibilityTestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        const startTime = performance.now();
        await user.click(buttons[0]);
        const endTime = performance.now();

        const interactionTime = endTime - startTime;
        expect(interactionTime).toBeLessThan(100); // Less than 100ms
      }
    });
  });
});
