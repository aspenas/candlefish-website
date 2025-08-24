/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteSelector } from '../../../components/netlify/SiteSelector';
import { mockCandlefishSites, createMockSite } from '../../factories/netlify-factory';

describe('SiteSelector', () => {
  const mockOnSiteSelect = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all provided sites', () => {
      render(
        <SiteSelector
          sites={mockCandlefishSites}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      expect(screen.getByText('Candlefish AI')).toBeInTheDocument();
      expect(screen.getByText('Staging - Candlefish AI')).toBeInTheDocument();
      expect(screen.getByText('Paintbox Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Inventory Management')).toBeInTheDocument();
      expect(screen.getByText('Promoteros Social')).toBeInTheDocument();
      expect(screen.getByText('Claude Documentation')).toBeInTheDocument();
      expect(screen.getByText('Operations Dashboard')).toBeInTheDocument();
      expect(screen.getByText('IBM Portfolio')).toBeInTheDocument();
    });

    it('should show empty state when no sites provided', () => {
      render(
        <SiteSelector
          sites={[]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      expect(screen.getByText(/no sites available/i)).toBeInTheDocument();
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('should display site status indicators correctly', () => {
      const sites = [
        createMockSite({ id: 'active-site', name: 'Active Site', status: 'active' }),
        createMockSite({ id: 'building-site', name: 'Building Site', status: 'building' }),
        createMockSite({ id: 'error-site', name: 'Error Site', status: 'error' }),
        createMockSite({ id: 'inactive-site', name: 'Inactive Site', status: 'inactive' })
      ];

      render(
        <SiteSelector
          sites={sites}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      expect(screen.getByTestId('status-active')).toBeInTheDocument();
      expect(screen.getByTestId('status-building')).toBeInTheDocument();
      expect(screen.getByTestId('status-error')).toBeInTheDocument();
      expect(screen.getByTestId('status-inactive')).toBeInTheDocument();
    });
  });

  describe('Site Selection', () => {
    it('should highlight selected site', () => {
      const selectedSite = mockCandlefishSites[0];

      render(
        <SiteSelector
          sites={mockCandlefishSites}
          selectedSite={selectedSite}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const selectedButton = screen.getByRole('button', { name: new RegExp(selectedSite.name, 'i') });
      expect(selectedButton).toHaveClass('ring-2', 'ring-operation-active');
      expect(selectedButton).toHaveAttribute('aria-selected', 'true');
    });

    it('should call onSiteSelect when site is clicked', async () => {
      const targetSite = mockCandlefishSites[1];

      render(
        <SiteSelector
          sites={mockCandlefishSites}
          selectedSite={mockCandlefishSites[0]}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const siteButton = screen.getByRole('button', { name: new RegExp(targetSite.name, 'i') });
      await user.click(siteButton);

      expect(mockOnSiteSelect).toHaveBeenCalledWith(targetSite);
    });

    it('should not call onSiteSelect when already selected site is clicked', async () => {
      const selectedSite = mockCandlefishSites[0];

      render(
        <SiteSelector
          sites={mockCandlefishSites}
          selectedSite={selectedSite}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const selectedButton = screen.getByRole('button', { name: new RegExp(selectedSite.name, 'i') });
      await user.click(selectedButton);

      expect(mockOnSiteSelect).not.toHaveBeenCalled();
    });
  });

  describe('Site Information Display', () => {
    it('should show site URL and deployment info', () => {
      const site = createMockSite({
        name: 'Test Site',
        url: 'https://test.candlefish.ai',
        deployBranch: 'production',
        lastDeploy: new Date('2024-01-20T10:00:00Z'),
        buildTime: 65
      });

      render(
        <SiteSelector
          sites={[site]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      expect(screen.getByText('https://test.candlefish.ai')).toBeInTheDocument();
      expect(screen.getByText('production')).toBeInTheDocument();
      expect(screen.getByText('65s')).toBeInTheDocument();
      expect(screen.getByText(/last deploy/i)).toBeInTheDocument();
    });

    it('should show repository information when available', () => {
      const site = createMockSite({
        repository: {
          provider: 'github',
          repo: 'candlefish-ai/test-repo'
        }
      });

      render(
        <SiteSelector
          sites={[site]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      expect(screen.getByText('candlefish-ai/test-repo')).toBeInTheDocument();
      expect(screen.getByTestId('github-icon')).toBeInTheDocument();
    });

    it('should handle missing deployment information gracefully', () => {
      const site = createMockSite({
        lastDeploy: undefined,
        buildTime: undefined
      });

      render(
        <SiteSelector
          sites={[site]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      expect(screen.getByText('Never deployed')).toBeInTheDocument();
      expect(screen.queryByText(/\ds/)).not.toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show correct status colors and icons', () => {
      const sites = [
        createMockSite({ id: 'active', status: 'active' }),
        createMockSite({ id: 'building', status: 'building' }),
        createMockSite({ id: 'error', status: 'error' }),
        createMockSite({ id: 'inactive', status: 'inactive' })
      ];

      render(
        <SiteSelector
          sites={sites}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      // Active should have green indicator
      const activeIndicator = screen.getByTestId('status-active');
      expect(activeIndicator).toHaveClass('bg-operation-complete');

      // Building should have blue indicator with animation
      const buildingIndicator = screen.getByTestId('status-building');
      expect(buildingIndicator).toHaveClass('bg-operation-pending', 'animate-pulse');

      // Error should have red indicator
      const errorIndicator = screen.getByTestId('status-error');
      expect(errorIndicator).toHaveClass('bg-red-500');

      // Inactive should have gray indicator
      const inactiveIndicator = screen.getByTestId('status-inactive');
      expect(inactiveIndicator).toHaveClass('bg-gray-500');
    });

    it('should show status text on hover', async () => {
      const site = createMockSite({ status: 'building' });

      render(
        <SiteSelector
          sites={[site]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const siteButton = screen.getByRole('button', { name: new RegExp(site.name, 'i') });
      await user.hover(siteButton);

      expect(screen.getByText('Building')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support arrow key navigation', async () => {
      render(
        <SiteSelector
          sites={mockCandlefishSites.slice(0, 3)} // Use first 3 sites
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const firstSite = screen.getByRole('button', { name: new RegExp(mockCandlefishSites[0].name, 'i') });
      firstSite.focus();

      // Arrow down should move to next site
      await user.keyboard('[ArrowDown]');
      const secondSite = screen.getByRole('button', { name: new RegExp(mockCandlefishSites[1].name, 'i') });
      expect(secondSite).toHaveFocus();

      // Arrow up should move back
      await user.keyboard('[ArrowUp]');
      expect(firstSite).toHaveFocus();

      // Arrow down twice should move to third site
      await user.keyboard('[ArrowDown]');
      await user.keyboard('[ArrowDown]');
      const thirdSite = screen.getByRole('button', { name: new RegExp(mockCandlefishSites[2].name, 'i') });
      expect(thirdSite).toHaveFocus();
    });

    it('should wrap around at beginning and end', async () => {
      const sites = mockCandlefishSites.slice(0, 3);
      render(
        <SiteSelector
          sites={sites}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const firstSite = screen.getByRole('button', { name: new RegExp(sites[0].name, 'i') });
      firstSite.focus();

      // Arrow up from first should go to last
      await user.keyboard('[ArrowUp]');
      const lastSite = screen.getByRole('button', { name: new RegExp(sites[2].name, 'i') });
      expect(lastSite).toHaveFocus();

      // Arrow down from last should go to first
      await user.keyboard('[ArrowDown]');
      expect(firstSite).toHaveFocus();
    });

    it('should select site with Enter or Space', async () => {
      render(
        <SiteSelector
          sites={mockCandlefishSites.slice(0, 2)}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const firstSite = screen.getByRole('button', { name: new RegExp(mockCandlefishSites[0].name, 'i') });
      firstSite.focus();

      await user.keyboard('[Enter]');
      expect(mockOnSiteSelect).toHaveBeenCalledWith(mockCandlefishSites[0]);

      mockOnSiteSelect.mockClear();

      const secondSite = screen.getByRole('button', { name: new RegExp(mockCandlefishSites[1].name, 'i') });
      secondSite.focus();

      await user.keyboard('[Space]');
      expect(mockOnSiteSelect).toHaveBeenCalledWith(mockCandlefishSites[1]);
    });
  });

  describe('Responsive Design', () => {
    it('should use horizontal scrolling on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(
        <SiteSelector
          sites={mockCandlefishSites}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const container = screen.getByTestId('site-selector-container');
      expect(container).toHaveClass('overflow-x-auto');
      expect(container.firstChild).toHaveClass('flex', 'space-x-2');
    });

    it('should use grid layout on desktop', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });

      render(
        <SiteSelector
          sites={mockCandlefishSites}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const container = screen.getByTestId('site-selector-container');
      expect(container.firstChild).toHaveClass('grid', 'grid-cols-2', 'lg:grid-cols-4');
    });

    it('should show compact view on small screens', () => {
      const site = createMockSite({
        name: 'Very Long Site Name That Should Be Truncated',
        url: 'https://very-long-subdomain.candlefish.ai'
      });

      render(
        <SiteSelector
          sites={[site]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const nameElement = screen.getByText(/very long site name/i);
      expect(nameElement).toHaveClass('truncate');
    });
  });

  describe('Performance and Build Information', () => {
    it('should show build time with appropriate color coding', () => {
      const fastSite = createMockSite({ buildTime: 25 }); // Fast build
      const slowSite = createMockSite({ buildTime: 180 }); // Slow build

      const { rerender } = render(
        <SiteSelector
          sites={[fastSite]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const fastBuildTime = screen.getByText('25s');
      expect(fastBuildTime).toHaveClass('text-operation-complete');

      rerender(
        <SiteSelector
          sites={[slowSite]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const slowBuildTime = screen.getByText('180s');
      expect(slowBuildTime).toHaveClass('text-operation-alert');
    });

    it('should format deployment timestamps correctly', () => {
      const recentSite = createMockSite({
        lastDeploy: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      });
      const oldSite = createMockSite({
        lastDeploy: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      });

      const { rerender } = render(
        <SiteSelector
          sites={[recentSite]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();

      rerender(
        <SiteSelector
          sites={[oldSite]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      expect(screen.getByText(/7 days ago/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SiteSelector
          sites={mockCandlefishSites.slice(0, 3)}
          selectedSite={mockCandlefishSites[0]}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const selectorContainer = screen.getByRole('tablist');
      expect(selectorContainer).toHaveAttribute('aria-label', 'Select site');

      const siteButtons = screen.getAllByRole('tab');
      expect(siteButtons).toHaveLength(3);

      // Selected site should have aria-selected="true"
      const selectedButton = screen.getByRole('tab', { name: new RegExp(mockCandlefishSites[0].name, 'i') });
      expect(selectedButton).toHaveAttribute('aria-selected', 'true');

      // Other sites should have aria-selected="false"
      const otherButtons = siteButtons.filter(btn => btn !== selectedButton);
      otherButtons.forEach(btn => {
        expect(btn).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('should announce status changes to screen readers', async () => {
      render(
        <SiteSelector
          sites={mockCandlefishSites.slice(0, 2)}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const siteButton = screen.getByRole('tab', { name: new RegExp(mockCandlefishSites[0].name, 'i') });
      await user.click(siteButton);

      expect(screen.getByRole('status')).toHaveTextContent(/site selected/i);
    });

    it('should provide descriptive text for status indicators', () => {
      const sites = [
        createMockSite({ id: 'building-site', status: 'building' }),
        createMockSite({ id: 'error-site', status: 'error' })
      ];

      render(
        <SiteSelector
          sites={sites}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const buildingButton = screen.getByRole('tab', { name: /building-site/i });
      expect(buildingButton).toHaveAttribute('aria-describedby');

      const buildingDescription = document.getElementById(buildingButton.getAttribute('aria-describedby')!);
      expect(buildingDescription).toHaveTextContent(/currently building/i);

      const errorButton = screen.getByRole('tab', { name: /error-site/i });
      const errorDescription = document.getElementById(errorButton.getAttribute('aria-describedby')!);
      expect(errorDescription).toHaveTextContent(/deployment error/i);
    });

    it('should support screen reader navigation', () => {
      render(
        <SiteSelector
          sites={mockCandlefishSites.slice(0, 3)}
          selectedSite={mockCandlefishSites[0]}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const siteButtons = screen.getAllByRole('tab');

      siteButtons.forEach((button, index) => {
        expect(button).toHaveAttribute('aria-posinset', (index + 1).toString());
        expect(button).toHaveAttribute('aria-setsize', '3');
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state when sites are being fetched', () => {
      render(
        <SiteSelector
          sites={[]}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      expect(screen.getByTestId('loading-sites')).toBeInTheDocument();
      expect(screen.getByText(/loading sites/i)).toBeInTheDocument();
    });

    it('should handle site data errors gracefully', () => {
      const sitesWithErrors = [
        createMockSite({ name: 'Valid Site' }),
        { ...createMockSite(), name: '' } as any, // Invalid site
      ];

      // Should not crash with invalid data
      expect(() => {
        render(
          <SiteSelector
            sites={sitesWithErrors}
            selectedSite={null}
            onSiteSelect={mockOnSiteSelect}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Site Filtering and Search', () => {
    it('should filter sites by status', () => {
      const sites = [
        createMockSite({ id: 'active-1', name: 'Active Site 1', status: 'active' }),
        createMockSite({ id: 'active-2', name: 'Active Site 2', status: 'active' }),
        createMockSite({ id: 'inactive-1', name: 'Inactive Site', status: 'inactive' })
      ];

      render(
        <SiteSelector
          sites={sites}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      // Filter by active status
      const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
      fireEvent.change(statusFilter, { target: { value: 'active' } });

      expect(screen.getByText('Active Site 1')).toBeInTheDocument();
      expect(screen.getByText('Active Site 2')).toBeInTheDocument();
      expect(screen.queryByText('Inactive Site')).not.toBeInTheDocument();
    });

    it('should search sites by name', async () => {
      render(
        <SiteSelector
          sites={mockCandlefishSites}
          selectedSite={null}
          onSiteSelect={mockOnSiteSelect}
        />
      );

      const searchInput = screen.getByRole('searchbox', { name: /search sites/i });
      await user.type(searchInput, 'paintbox');

      expect(screen.getByText('Paintbox Portfolio')).toBeInTheDocument();
      expect(screen.queryByText('Candlefish AI')).not.toBeInTheDocument();
    });
  });
});
