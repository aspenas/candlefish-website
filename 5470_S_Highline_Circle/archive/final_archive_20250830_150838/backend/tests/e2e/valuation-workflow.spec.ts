import { test, expect, Page } from '@playwright/test';

// Test configuration
test.describe.configure({ mode: 'serial' });

// Page Object Model for Valuation functionality
class ValuationPage {
  constructor(private page: Page) {}

  // Locators
  get itemsList() { return this.page.getByTestId('items-list'); }
  get valuationCard() { return this.page.getByTestId('valuation-card'); }
  get requestValuationButton() { return this.page.getByRole('button', { name: /request valuation/i }); }
  get refreshValuationButton() { return this.page.getByRole('button', { name: /refresh valuation/i }); }
  get estimatedValueDisplay() { return this.page.getByTestId('estimated-value'); }
  get confidenceScoreDisplay() { return this.page.getByTestId('confidence-score'); }
  get valuationMethodDisplay() { return this.page.getByTestId('valuation-method'); }
  get valueChangeDisplay() { return this.page.getByTestId('value-change'); }
  get marketComparisonsSection() { return this.page.getByTestId('market-comparisons'); }
  get priceHistoryChart() { return this.page.getByTestId('price-history-chart'); }
  get loadingSpinner() { return this.page.getByTestId('valuation-loading-spinner'); }
  get errorMessage() { return this.page.getByTestId('valuation-error'); }
  get exportReportButton() { return this.page.getByRole('button', { name: /export report/i }); }

  // Actions
  async navigateToItem(itemId: string) {
    await this.page.goto(`/items/${itemId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async requestMarketValuation() {
    await this.requestValuationButton.click();
    
    // Wait for request to be submitted
    await expect(this.page.getByText(/valuation requested/i)).toBeVisible();
  }

  async refreshValuation() {
    await this.refreshValuationButton.click();
    
    // Wait for refresh to complete
    await this.loadingSpinner.waitFor({ state: 'hidden' });
  }

  async waitForValuationToLoad() {
    await this.loadingSpinner.waitFor({ state: 'hidden' });
    await expect(this.valuationCard).toBeVisible();
  }

  async exportValuationReport() {
    // Start download and capture the download
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportReportButton.click();
    const download = await downloadPromise;
    return download;
  }
}

class PricingInsightsDashboardPage {
  constructor(private page: Page) {}

  // Locators
  get dashboard() { return this.page.getByTestId('pricing-insights-dashboard'); }
  get totalItemsCard() { return this.page.getByTestId('total-items-card'); }
  get totalValueCard() { return this.page.getByTestId('total-value-card'); }
  get overallChangeCard() { return this.page.getByTestId('overall-change-card'); }
  get roomSummariesTable() { return this.page.getByTestId('room-summaries-table'); }
  get marketInsightsSection() { return this.page.getByTestId('market-insights'); }
  get topPerformersSection() { return this.page.getByTestId('top-performers'); }
  get needsUpdateSection() { return this.page.getByTestId('needs-update'); }
  get refreshDashboardButton() { return this.page.getByRole('button', { name: /refresh/i }); }
  get exportDashboardButton() { return this.page.getByRole('button', { name: /export report/i }); }
  get timePeriodSelect() { return this.page.getByLabel(/time period/i); }
  get roomFilters() { return this.page.getByTestId('room-filters'); }

  // Actions
  async navigateToDashboard() {
    await this.page.goto('/valuation/insights');
    await this.page.waitForLoadState('networkidle');
  }

  async selectTimePeriod(period: string) {
    await this.timePeriodSelect.selectOption(period);
    await this.page.waitForLoadState('networkidle');
  }

  async toggleRoomFilter(roomName: string) {
    const checkbox = this.page.getByRole('checkbox', { name: new RegExp(roomName, 'i') });
    await checkbox.click();
    await this.page.waitForLoadState('networkidle');
  }

  async refreshDashboard() {
    await this.refreshDashboardButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async exportReport() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportDashboardButton.click();
    const download = await downloadPromise;
    return download;
  }
}

// Test Data Setup
const testData = {
  testItem: {
    id: 'test-item-e2e-001',
    name: 'E2E Test Sofa',
    category: 'Furniture',
    purchasePrice: 1200.00,
    condition: 'good',
  },
  testRoom: {
    id: 'test-room-e2e-001',
    name: 'E2E Test Living Room',
  },
};

// Mock API responses for consistent testing
test.beforeEach(async ({ page }) => {
  // Mock successful valuation response
  await page.route('**/api/valuations/current/*', async (route) => {
    await route.fulfill({
      json: {
        itemId: testData.testItem.id,
        valuationId: 'val-e2e-001',
        valuationMethod: 'market_lookup',
        estimatedValue: 1150.00,
        confidenceScore: 0.85,
        valuationDate: new Date().toISOString(),
        itemName: testData.testItem.name,
        purchasePrice: testData.testItem.purchasePrice,
        askingPrice: 1100.00,
        valueChangePercent: -4.2,
      },
    });
  });

  // Mock valuation request response
  await page.route('**/api/valuations/request', async (route) => {
    await route.fulfill({
      status: 202,
      json: {
        id: 'req-e2e-001',
        itemId: testData.testItem.id,
        requestType: 'market_lookup',
        status: 'pending',
        priority: 1,
        estimatedCompletion: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        createdAt: new Date().toISOString(),
      },
    });
  });

  // Mock pricing insights response
  await page.route('**/api/valuations/insights', async (route) => {
    await route.fulfill({
      json: {
        totalItems: 156,
        itemsWithValuations: 124,
        totalPurchaseValue: 45600.00,
        totalCurrentValue: 38800.00,
        overallAppreciation: -6800.00,
        roomSummaries: [
          {
            roomId: 'room-1',
            roomName: 'Living Room',
            floor: 'Main Floor',
            itemsWithValuations: 8,
            totalPurchaseValue: 18500.00,
            totalEstimatedValue: 15200.00,
            avgConfidence: 0.85,
            totalAppreciation: -3300.00,
            appreciationPercent: -17.8,
          },
          {
            roomId: 'room-2',
            roomName: 'Bedroom',
            floor: 'Upper Floor',
            itemsWithValuations: 6,
            totalPurchaseValue: 12400.00,
            totalEstimatedValue: 10800.00,
            avgConfidence: 0.78,
            totalAppreciation: -1600.00,
            appreciationPercent: -12.9,
          },
        ],
        marketInsights: [
          {
            category: 'Furniture',
            brand: 'West Elm',
            itemCount: 12,
            avgCurrentValue: 850.00,
            avgPurchasePrice: 1200.00,
            avgConfidence: 0.83,
            retentionPercent: 72.0,
            marketComparisonsAvailable: 96,
          },
        ],
        topPerformers: [
          {
            itemId: 'item-top-1',
            itemName: 'Vintage Armchair',
            estimatedValue: 1250.00,
            purchasePrice: 1000.00,
            valueChangePercent: 25.0,
          },
        ],
        needsUpdate: [
          {
            itemId: 'item-stale-1',
            itemName: 'Modern Sofa',
            estimatedValue: 800.00,
            valuationDate: '2023-10-15T00:00:00Z',
          },
        ],
      },
    });
  });
});

// E2E Test Suites
test.describe('Valuation Workflow', () => {
  let valuationPage: ValuationPage;

  test.beforeEach(async ({ page }) => {
    valuationPage = new ValuationPage(page);
  });

  test('should display current valuation information', async ({ page }) => {
    await valuationPage.navigateToItem(testData.testItem.id);

    // Verify valuation card is displayed
    await expect(valuationPage.valuationCard).toBeVisible();
    
    // Verify valuation details
    await expect(valuationPage.estimatedValueDisplay).toContainText('$1,150.00');
    await expect(valuationPage.confidenceScoreDisplay).toContainText('85%');
    await expect(valuationPage.valuationMethodDisplay).toContainText('Market Lookup');
    await expect(valuationPage.valueChangeDisplay).toContainText('-4.2%');

    // Take screenshot for visual regression testing
    await expect(page).toHaveScreenshot('valuation-card-display.png');
  });

  test('should handle valuation request workflow', async ({ page }) => {
    // Mock no current valuation to trigger request flow
    await page.route('**/api/valuations/current/*', async (route) => {
      await route.fulfill({
        status: 404,
        json: { error: 'No valuation found' },
      });
    });

    await valuationPage.navigateToItem(testData.testItem.id);

    // Should show request valuation button
    await expect(valuationPage.requestValuationButton).toBeVisible();
    await expect(page.getByText('No Valuation Available')).toBeVisible();

    // Request market valuation
    await valuationPage.requestMarketValuation();

    // Should show success message
    await expect(page.getByText(/valuation requested/i)).toBeVisible();
    
    // Should show pending status
    await expect(page.getByText(/pending/i)).toBeVisible();
  });

  test('should refresh valuation data', async ({ page }) => {
    await valuationPage.navigateToItem(testData.testItem.id);
    
    // Initial valuation should be loaded
    await valuationPage.waitForValuationToLoad();
    await expect(valuationPage.estimatedValueDisplay).toContainText('$1,150.00');

    // Mock updated valuation response
    await page.route('**/api/valuations/current/*', async (route) => {
      await route.fulfill({
        json: {
          itemId: testData.testItem.id,
          valuationId: 'val-e2e-001-updated',
          valuationMethod: 'market_lookup',
          estimatedValue: 1175.00, // Updated value
          confidenceScore: 0.88,   // Updated confidence
          valuationDate: new Date().toISOString(),
          itemName: testData.testItem.name,
          purchasePrice: testData.testItem.purchasePrice,
          askingPrice: 1100.00,
          valueChangePercent: -2.1, // Updated change
        },
      });
    });

    // Refresh valuation
    await valuationPage.refreshValuation();

    // Should show updated values
    await expect(valuationPage.estimatedValueDisplay).toContainText('$1,175.00');
    await expect(valuationPage.confidenceScoreDisplay).toContainText('88%');
    await expect(valuationPage.valueChangeDisplay).toContainText('-2.1%');
  });

  test('should handle valuation errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/valuations/current/*', async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: 'Internal server error' },
      });
    });

    await valuationPage.navigateToItem(testData.testItem.id);

    // Should show error message
    await expect(valuationPage.errorMessage).toBeVisible();
    await expect(page.getByText(/error loading valuation/i)).toBeVisible();
    
    // Should show try again button
    const tryAgainButton = page.getByRole('button', { name: /try again/i });
    await expect(tryAgainButton).toBeVisible();

    // Mock successful response for retry
    await page.route('**/api/valuations/current/*', async (route) => {
      await route.fulfill({
        json: {
          itemId: testData.testItem.id,
          valuationId: 'val-e2e-001',
          valuationMethod: 'market_lookup',
          estimatedValue: 1150.00,
          confidenceScore: 0.85,
          valuationDate: new Date().toISOString(),
          itemName: testData.testItem.name,
        },
      });
    });

    // Retry should work
    await tryAgainButton.click();
    await valuationPage.waitForValuationToLoad();
    await expect(valuationPage.estimatedValueDisplay).toContainText('$1,150.00');
  });

  test('should export valuation report', async ({ page }) => {
    await valuationPage.navigateToItem(testData.testItem.id);
    await valuationPage.waitForValuationToLoad();

    // Mock export API
    await page.route('**/api/valuations/export/*', async (route) => {
      // Return PDF binary content
      const pdfContent = Buffer.from('Mock PDF content');
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="valuation-report-${testData.testItem.id}.pdf"`,
        },
        body: pdfContent,
      });
    });

    // Export report
    const download = await valuationPage.exportValuationReport();
    
    // Verify download
    expect(download.suggestedFilename()).toBe(`valuation-report-${testData.testItem.id}.pdf`);
  });

  test('should handle real-time valuation updates via WebSocket', async ({ page }) => {
    await valuationPage.navigateToItem(testData.testItem.id);
    await valuationPage.waitForValuationToLoad();

    // Mock WebSocket connection and message
    await page.evaluate(() => {
      // Simulate WebSocket message for valuation update
      const event = new CustomEvent('valuation-updated', {
        detail: {
          itemId: 'test-item-e2e-001',
          estimatedValue: 1200.00,
          confidenceScore: 0.90,
        },
      });
      window.dispatchEvent(event);
    });

    // Should automatically update display
    await expect(valuationPage.estimatedValueDisplay).toContainText('$1,200.00', { timeout: 5000 });
    await expect(valuationPage.confidenceScoreDisplay).toContainText('90%');
  });
});

test.describe('Pricing Insights Dashboard', () => {
  let dashboardPage: PricingInsightsDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new PricingInsightsDashboardPage(page);
  });

  test('should display pricing insights overview', async ({ page }) => {
    await dashboardPage.navigateToDashboard();

    // Verify dashboard is loaded
    await expect(dashboardPage.dashboard).toBeVisible();

    // Verify summary cards
    await expect(dashboardPage.totalItemsCard).toContainText('156');
    await expect(dashboardPage.totalValueCard).toContainText('$38,800.00');
    await expect(dashboardPage.overallChangeCard).toContainText('-$6,800.00');
    await expect(dashboardPage.overallChangeCard).toContainText('(-14.9%)');

    // Verify room summaries table
    await expect(dashboardPage.roomSummariesTable).toBeVisible();
    await expect(page.getByText('Living Room')).toBeVisible();
    await expect(page.getByText('Bedroom')).toBeVisible();

    // Verify market insights
    await expect(dashboardPage.marketInsightsSection).toBeVisible();
    await expect(page.getByText('West Elm')).toBeVisible();
    await expect(page.getByText('72%')).toBeVisible(); // Retention percent

    // Take screenshot
    await expect(page).toHaveScreenshot('pricing-insights-dashboard.png');
  });

  test('should filter data by time period', async ({ page }) => {
    await dashboardPage.navigateToDashboard();

    // Change time period to 6 months
    await dashboardPage.selectTimePeriod('6months');

    // Mock updated response for 6 months
    await page.route('**/api/valuations/insights*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('timePeriod') === '6months') {
        await route.fulfill({
          json: {
            totalItems: 120,
            itemsWithValuations: 95,
            totalPurchaseValue: 35000.00,
            totalCurrentValue: 30000.00,
            overallAppreciation: -5000.00,
            // ... other fields with updated data
          },
        });
      }
    });

    // Should show updated data for 6 months
    await expect(dashboardPage.totalItemsCard).toContainText('120');
    await expect(dashboardPage.totalValueCard).toContainText('$30,000.00');
  });

  test('should filter data by room', async ({ page }) => {
    await dashboardPage.navigateToDashboard();

    // Toggle bedroom filter off
    await dashboardPage.toggleRoomFilter('Bedroom');

    // Should update the display to exclude bedroom data
    // This would depend on the frontend implementation
    await expect(page.getByText('Bedroom')).not.toBeVisible();
  });

  test('should refresh dashboard data', async ({ page }) => {
    await dashboardPage.navigateToDashboard();

    // Verify initial data
    await expect(dashboardPage.totalItemsCard).toContainText('156');

    // Mock updated response
    await page.route('**/api/valuations/insights', async (route) => {
      await route.fulfill({
        json: {
          totalItems: 160, // Updated count
          itemsWithValuations: 128,
          totalPurchaseValue: 47000.00,
          totalCurrentValue: 40000.00,
          overallAppreciation: -7000.00,
          // ... rest of mock data
        },
      });
    });

    // Refresh dashboard
    await dashboardPage.refreshDashboard();

    // Should show updated data
    await expect(dashboardPage.totalItemsCard).toContainText('160');
  });

  test('should export dashboard report', async ({ page }) => {
    await dashboardPage.navigateToDashboard();

    // Mock export API
    await page.route('**/api/valuations/insights/export', async (route) => {
      const pdfContent = Buffer.from('Mock pricing insights PDF report');
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="pricing-insights-report.pdf"',
        },
        body: pdfContent,
      });
    });

    // Export report
    const download = await dashboardPage.exportReport();
    
    // Verify download
    expect(download.suggestedFilename()).toBe('pricing-insights-report.pdf');
  });

  test('should handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await dashboardPage.navigateToDashboard();

    // Dashboard should be responsive
    await expect(dashboardPage.dashboard).toBeVisible();
    
    // Summary cards should stack vertically on mobile
    const summaryCards = page.getByTestId('summary-cards');
    await expect(summaryCards).toHaveClass(/mobile-stack/);

    // Tables should be horizontally scrollable
    const table = dashboardPage.roomSummariesTable;
    await expect(table).toHaveClass(/table-responsive/);

    // Take mobile screenshot
    await expect(page).toHaveScreenshot('pricing-insights-mobile.png');
  });
});

// Cross-browser tests
test.describe('Cross-browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach((browserName) => {
    test(`should work correctly in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `Running only on ${browserName}`);
      
      const valuationPage = new ValuationPage(page);
      await valuationPage.navigateToItem(testData.testItem.id);
      
      // Core functionality should work across browsers
      await expect(valuationPage.valuationCard).toBeVisible();
      await expect(valuationPage.estimatedValueDisplay).toContainText('$1,150.00');
      
      // Browser-specific validations could go here
      if (browserName === 'webkit') {
        // Safari-specific tests
        await expect(page).toHaveScreenshot(`valuation-safari.png`);
      }
    });
  });
});

// Performance tests
test.describe('Performance', () => {
  test('should load valuation data within performance budget', async ({ page }) => {
    // Start performance monitoring
    const startTime = Date.now();
    
    const valuationPage = new ValuationPage(page);
    await valuationPage.navigateToItem(testData.testItem.id);
    await valuationPage.waitForValuationToLoad();
    
    const loadTime = Date.now() - startTime;
    
    // Valuation should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });
    
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1500);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset response
    const largeRoomSummaries = Array.from({ length: 50 }, (_, i) => ({
      roomId: `room-${i}`,
      roomName: `Test Room ${i + 1}`,
      floor: 'Main Floor',
      itemsWithValuations: Math.floor(Math.random() * 20),
      totalPurchaseValue: Math.random() * 10000,
      totalEstimatedValue: Math.random() * 8000,
      avgConfidence: Math.random(),
    }));

    await page.route('**/api/valuations/insights', async (route) => {
      await route.fulfill({
        json: {
          totalItems: 2500,
          itemsWithValuations: 2000,
          totalPurchaseValue: 500000.00,
          totalCurrentValue: 420000.00,
          overallAppreciation: -80000.00,
          roomSummaries: largeRoomSummaries,
          marketInsights: [],
          topPerformers: [],
          needsUpdate: [],
        },
      });
    });

    const dashboardPage = new PricingInsightsDashboardPage(page);
    const startTime = Date.now();
    
    await dashboardPage.navigateToDashboard();
    await expect(dashboardPage.roomSummariesTable).toBeVisible();
    
    const renderTime = Date.now() - startTime;
    
    // Should render large dataset within 5 seconds
    expect(renderTime).toBeLessThan(5000);
    
    // Table should be scrollable
    await expect(dashboardPage.roomSummariesTable).toBeVisible();
    
    // Should handle scrolling smoothly
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100); // Allow scroll to complete
    
    // Content should still be visible after scrolling
    await expect(page.getByText('Test Room 1')).toBeVisible();
  });
});

// Accessibility tests
test.describe('Accessibility', () => {
  test('should be accessible to screen readers', async ({ page }) => {
    const valuationPage = new ValuationPage(page);
    await valuationPage.navigateToItem(testData.testItem.id);
    
    // Check for proper ARIA labels
    await expect(valuationPage.estimatedValueDisplay).toHaveAttribute('aria-label', /estimated value/i);
    await expect(valuationPage.confidenceScoreDisplay).toHaveAttribute('aria-label', /confidence score/i);
    
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingTexts = await headings.allTextContents();
    expect(headingTexts).toContain('Current Valuation');
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    await expect(valuationPage.refreshValuationButton).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(valuationPage.requestValuationButton.or(valuationPage.exportReportButton)).toBeFocused();
  });

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast media query
    await page.emulateMedia({ colorScheme: 'dark' });
    
    const valuationPage = new ValuationPage(page);
    await valuationPage.navigateToItem(testData.testItem.id);
    
    // Elements should have high contrast styling
    const card = valuationPage.valuationCard;
    await expect(card).toHaveClass(/high-contrast/);
    
    await expect(page).toHaveScreenshot('valuation-high-contrast.png');
  });
});